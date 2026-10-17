"""Build a reviewable catalogue manifest from extracted merchant sheets; no Shopify writes."""
import argparse, json, re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

def minor(value):
    match=re.fullmatch(r'\$\s*([\d,]+\.\d{2})',value.strip())
    if not match: raise ValueError('Expected an exact source SGD amount: '+value)
    return int(Decimal(match[1].replace(',',''))*100)

def build(source):
    bundles=[]; subscriptions=[]
    for document in source['sources']:
        is_subscription=document['file'].startswith('Meal_Subscriptions_')
        for slide in document['slides']:
            text=slide['text']; quantity=slide['listedQuantity']
            if quantity<1: raise ValueError('Missing source contents')
            evidence={'file':document['file'],'sha256':document['sha256'],'slide':slide['slide']}
            record={'title':slide['title'].strip(),'contents':slide['contents'],'itemsPerDelivery':quantity,'gstIncluded':True,'source':evidence,'nativeMappingVerified':False}
            if is_subscription:
                terms=[]
                for months in (3,6):
                    index=next(i for i,value in enumerate(text) if re.match(rf'^{months} MONTHS\b',value,re.I))
                    terms.append({'months':months,'deliveries':months,'upfrontMinor':minor(text[index+1])})
                record.update({'terms':terms,'comparisonOnlyOneMonth':True,'automaticTermRenewal':True,'calendarRuleStatus':'MERCHANT_CLARIFICATION_PENDING','deliveryIncluded':True})
                subscriptions.append(record)
            else:
                if 'BUNDLE PURCHASE PRICE' in text or 'PURCHASE PRICE' in text:
                    label='BUNDLE PURCHASE PRICE' if 'BUNDLE PURCHASE PRICE' in text else 'PURCHASE PRICE'
                    price=minor(text[text.index(label)+1])
                else:
                    table=next(table for table in slide['tables'] if table and 'Purchase price' in table[0])
                    price=minor(table[1][table[0].index('Purchase price')])
                unit=int((Decimal(price)/quantity).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
                record.update({'purchasePriceMinor':price,'displayUnitMinor':unit})
                if 'Mixed Bundle' in record['title']:
                    if quantity!=14 or price!=10980 or unit!=784: raise ValueError('Mixed bundle differs from explicit user approval')
                    record['displayCorrection']='User approved 14 items / SGD 109.80 total / SGD 7.84 each on 15 October 2026.'
                bundles.append(record)
    if len(bundles)!=13 or len(subscriptions)!=8: raise ValueError('Unexpected source catalogue coverage')
    return {'version':'merchant-20261015','currency':'SGD','purpose':'Approved catalogue data; native product/component/image mapping still required before import','shopifyWritesPerformed':False,'bundles':bundles,'subscriptions':subscriptions}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('extracted',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    result=build(json.loads(args.extracted.read_text()));args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'bundles':len(result['bundles']),'subscriptionConfigurations':len(result['subscriptions']),'purchasableTerms':[3,6],'mutationsPerformed':False}))
