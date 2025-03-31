from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import requests

app = Flask(__name__)
CORS(app)


def transfer_currency(data, transcur):
    url  = f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{transcur}.json"
    currency_result = requests.get(url).json()[transcur]

    new_data = {} 

    for key, value in data.items():

        # 如果當前貨幣與查詢貨幣相同，則跳過
        this_currency = value['currency'].lower()

        if this_currency != "":

            # 如果當前貨幣不在查詢貨幣的匯率列表中，則跳過
            if this_currency not in currency_result:
                continue

            # 獲取當前貨幣對查詢貨幣的匯率
            rate = currency_result[this_currency]
            
            price_dict = value['og_price'].copy()  # 複製原有價格字典
            
            # 計算轉換後的價格
            for price_type, price_value in value['og_price'].items():
                if price_value == '':
                    
                    continue
                price_dict[price_type] = round(float(price_value) / rate, 2)
        else:
            # 如果當前貨幣為空，則使用原有價格
            price_dict = value['og_price'].copy()
            transcur = ""  # 使用當前貨幣作為查詢貨幣
            
        # 合併 price_dict 和 data
        new_data[key] = {
            **value,  # 保留原有資料
            "ec_price": price_dict,
            "ec_currency": transcur.upper(),  # 將查詢貨幣轉換為大寫
        }

    return new_data
    

@app.route('/getprice', methods=['GET'])
def get_price():
    # Get query parameters, with defaults
    transcur = request.args.get('transcur', 'twd').lower()

    # read csv file 
    file_data = []
    with open('latest.csv', 'r') as file:
        lines = file.readlines()
        for line in lines:
            file_data.append(line.strip().split(','))
    # Convert to JSON
    data = {}
    # country_code,country_name,mobile,basic,Standard/Ads,standard,premium,currency
    for row in file_data:
        data[row[0]] = {
            "iso2_code": row[0],
            "full_name": row[1],
            "currency": row[7],
            "og_price": {
                "Mobile": row[2],
                "Basic/Ads": row[3],
                "Standard/Ads": row[4],
                "Standard": row[5],
                "Premium": row[6]
            }
        }

    # Call transfer_currency with all parameters
    for key, value in data.items():
        if 'currency' not in value:
            value['currency'] = ""
    try:
        converted_data = transfer_currency(data, transcur)
        return jsonify(converted_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/old_diff', methods=['GET'])
def get_diff():
    data= []
    with open('diff.csv', 'r') as file:
        lines = file.readlines()
        for line in lines:
            data.append(line.strip().split(','))

    # Convert to JSON
    json_data = []
    for row in data:
        print(row)
        json_data.append({
            "date": row[0],
            "iso2_code": row[1],
            "full_name": row[2],

            "old_currency": row[13],
            "old_price": {
                "Mobile": row[3],
                "Basic/Ads": row[4],
                "Standard/Ads": row[5],
                "Standard": row[6],
                "Premium": row[7]
            },
            "new_currency": row[14],
            "new_price": {
                "Mobile": row[8],
                "Basic/Ads": row[9],
                "Standard/Ads": row[10],
                "Standard": row[11],
                "Premium": row[12]
            },
        })

    json_data.sort(key=lambda x: x['date'], reverse=True)
    json_data = json_data[1:]  # 取前10筆資料
    return jsonify(json_data), 200

# 健康檢查端點
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)