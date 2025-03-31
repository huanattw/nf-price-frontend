const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(cors());

async function transferCurrency(data, transcur) {
    try {
        const response = await axios.get(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${transcur}.json`);
        const currencyResult = response.data[transcur];

        const newData = {};

        for (const [key, value] of Object.entries(data)) {
            // If current currency is same as query currency, skip
            const thisCurrency = value.currency.toLowerCase();

            if (thisCurrency !== "") {
                // If current currency is not in the exchange rate list, skip
                if (!(thisCurrency in currencyResult)) {
                    continue;
                }

                // Get exchange rate
                const rate = currencyResult[thisCurrency];

                // Copy original price dictionary
                const priceDict = { ...value.og_price };

                // Calculate converted prices
                for (const [priceType, priceValue] of Object.entries(value.og_price)) {
                    if (priceValue === '') {
                        continue;
                    }
                    priceDict[priceType] = Math.round((parseFloat(priceValue) / rate) * 100) / 100;
                }

                // Merge priceDict with data
                newData[key] = {
                    ...value,
                    ec_price: priceDict,
                    ec_currency: transcur.toUpperCase()
                };
            } else {
                // If current currency is empty, use original price
                const priceDict = { ...value.og_price };
                const usedTranscur = "";

                // Merge priceDict with data
                newData[key] = {
                    ...value,
                    ec_price: priceDict,
                    ec_currency: usedTranscur
                };
            }
        }

        return newData;
    } catch (error) {
        console.error('Error in transferCurrency:', error);
        throw error;
    }
}

app.get('/getprice', async (req, res) => {
    try {
        // Get query parameters with defaults
        const transcur = (req.query.transcur || 'twd').toLowerCase();

        // Read CSV file
        const fileContent = fs.readFileSync('latest.csv', 'utf8');
        const lines = fileContent.split('\n');

        // Convert to JSON
        const data = {};
        // country_code,country_name,mobile,basic,Standard/Ads,standard,premium,currency
        for (const line of lines) {
            if (!line.trim()) continue;

            const row = line.trim().split(',');
            data[row[0]] = {
                iso2_code: row[0],
                full_name: row[1],
                currency: row[7] || "",
                og_price: {
                    "Mobile": row[2],
                    "Basic/Ads": row[3],
                    "Standard/Ads": row[4],
                    "Standard": row[5],
                    "Premium": row[6]
                }
            };
        }

        // Ensure all entries have a currency property
        for (const [key, value] of Object.entries(data)) {
            if (!('currency' in value)) {
                value.currency = "";
            }
        }

        // Call transferCurrency with all parameters
        const convertedData = await transferCurrency(data, transcur);
        res.json(convertedData);
    } catch (error) {
        console.error('Error in /getprice:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/change_log', (req, res) => {
    try {
        // Read CSV file
        const fileContent = fs.readFileSync('diff.csv', 'utf8');
        const lines = fileContent.split('\n');

        // Convert to JSON
        const jsonData = [];
        for (const line of lines) {
            if (!line.trim()) continue;

            const row = line.trim().split(',');
            jsonData.push({
                date: row[0],
                iso2_code: row[1],
                full_name: row[2],
                old_currency: row[13],
                old_price: {
                    "Mobile": row[3],
                    "Basic/Ads": row[4],
                    "Standard/Ads": row[5],
                    "Standard": row[6],
                    "Premium": row[7]
                },
                new_currency: row[14],
                new_price: {
                    "Mobile": row[8],
                    "Basic/Ads": row[9],
                    "Standard/Ads": row[10],
                    "Standard": row[11],
                    "Premium": row[12]
                }
            });
        }

        // Sort by date in descending order
        jsonData.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        // Take all but the first entry
        const slicedData = jsonData.slice(1);

        res.json(slicedData);
    } catch (error) {
        console.error('Error in /old_diff:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});