import os
import json
import csv
import requests

class NFLX:
    def __init__(self, country_code, country_name, currnecy, plans):
        self.iso2_code = country_code
        self.full_name = country_name
        self.og_plan = self.make_change(plans)
        self.currency = currnecy

    def make_change(self, plans):
        new_plans = {}
        new_plans['mobile'] = plans[0]['price']
        new_plans['basic'] = plans[2]['price']
        new_plans['Standard/Ads'] = plans[3]['price'] if plans[3]['price'] != None else plans[1]['price']
        new_plans['standard'] = plans[4]['price']
        new_plans['premium'] = plans[5]['price']
        return new_plans

class Diff:
    def __init__(self, date, country_code, country_name, old_plans, new_plans, old_currency, new_currency):
        self.date = date
        self.country_code = country_code
        self.country_name = country_name
        self.old_plans = old_plans
        self.new_plans = new_plans
        self.old_currency = old_currency
        self.new_currency = new_currency

def readfile(filename):
    with open(filename, 'r') as file:
        datas = file.read()
    datas = json.loads(datas)

    dd = []
    for data in datas:
        dd.append(NFLX(
            country_code=data['country_code'],
            country_name=data['country'],
            currnecy=data['currency'],
            plans=data['plans']
        ))
    return dd

def find_diff():
# Get all filenames in the current directory
    filenames = os.listdir('.')
    filenames = [filename for filename in filenames if filename.endswith('.json')]
    filenames.sort()  # Sort filenames in reverse order

    base_data = readfile(filenames[0])
    diffes = []
    for filename in filenames[1:]:
        new_data = readfile(filename)
        for base, new in zip(base_data, new_data):
            if base.og_plan != new.og_plan or base.currency != new.currency:
                diffes.append(Diff(
                    date=filename.split('.')[0],
                    country_code=new.iso2_code,
                    country_name=new.full_name,
                    old_plans=base.og_plan,
                    new_plans=new.og_plan,
                    old_currency=base.currency,
                    new_currency=new.currency
                ))
        base_data = new_data
        # Write the data to a CSV file

        with open('diffs.csv', 'w', newline='') as csvfile:
            fieldnames = ['date', 'country_code', 'country_name', 
                          'old_mobile', 'old_basic', 'old_standard_ads', 'old_standard', 'old_premium', 
                          'new_mobile', 'new_basic', 'new_standard_ads', 'new_standard', 'new_premium', 
                          'old_currency', 'new_currency']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            for diff in diffes:
                writer.writerow({
                    'date': diff.date,
                    'country_code': diff.country_code,
                    'country_name': diff.country_name,
                    'old_mobile': diff.old_plans.get('mobile'),
                    'old_basic': diff.old_plans.get('basic'),
                    'old_standard_ads': diff.old_plans.get('Standard/Ads'),
                    'old_standard': diff.old_plans.get('standard'),
                    'old_premium': diff.old_plans.get('premium'),
                    'new_mobile': diff.new_plans.get('mobile'),
                    'new_basic': diff.new_plans.get('basic'),
                    'new_standard_ads': diff.new_plans.get('Standard/Ads'),
                    'new_standard': diff.new_plans.get('standard'),
                    'new_premium': diff.new_plans.get('premium'),
                    'old_currency': diff.old_currency,
                    'new_currency': diff.new_currency
                })

def find_newest():
    url = 'https://raw.githubusercontent.com/tompec/netflix-prices/refs/heads/main/data/latest.json'
    response = requests.get(url)
    if response.status_code == 200:
        datas = response.json()
    else:
        print(f"Failed to fetch data: {response.status_code}")

    dd = []
    for item in datas:
        dd.append(NFLX(
            country_code=item['country_code'],
            country_name=item['country'],
            currnecy=item['currency'],
            plans=item['plans']
        ))

        # Write the data to a CSV file
    with open('latest.csv', 'w', newline='') as csvfile:
        fieldnames = ['country_code', 'country_name', 
                      'mobile', 'basic', 'Standard/Ads', 'standard', 'premium', 
                      'currency']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for data in dd:
            writer.writerow({
                'country_code': data.iso2_code,
                'country_name': data.full_name,
                'mobile': data.og_plan.get('mobile'),
                'basic': data.og_plan.get('basic'),
                'Standard/Ads': data.og_plan.get('Standard/Ads'),
                'standard': data.og_plan.get('standard'),
                'premium': data.og_plan.get('premium'),
                'currency': data.currency
            })



def main():
    find_newest()
    # find_diff()

if __name__ == "__main__":
    main()