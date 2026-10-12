import pathlib,json,re
for p in pathlib.Path('theme/sections').glob('*.liquid'):
 s=p.read_text();m=re.search(r'{% schema %}(.*?){% endschema %}',s,re.S)
 if not m:continue
 schema=json.loads(m[1]); edits=[]
 for owner,settings in [('section',schema.get('settings',[]))]+[('block',b.get('settings',[])) for b in schema.get('blocks',[])]:
  for setting in settings:
   if setting['type']=='url' and 'default' in setting and setting['default'] not in ['/collections','/collections/all']:
    edits.append((owner,setting['id'],setting.pop('default')))
 if p.name=='main-collection.liquid':
  for setting in schema['settings']:
   if setting.get('id') in ['single_collection','bundles_collection','subscription_collection']:
    setting['type']='text';setting['label']+=' handle'
  s=s.replace('assign mode_collection = section.settings[resource_key]','assign mode_handle = section.settings[resource_key] %}{% assign mode_collection = collections[mode_handle]')
 if p.name=='main-product.liquid':
  for setting in schema['settings']:
   if setting.get('id')=='related_collection':setting['type']='text';setting['label']+=' handle'
  s=s.replace('assign related_collection = section.settings.related_collection | default: back_collection','assign related_collection_handle = section.settings.related_collection\n  assign related_collection = collections[related_collection_handle] | default: back_collection')
 # Supply the same defaults in Liquid rather than invalid schema URL defaults.
 body=s.split('{% schema %}')[0]
 for owner,key,value in edits:
  body=re.sub(r'\b'+re.escape(owner+'.settings.'+key)+r'\b(?!\s*\|\s*default:)',lambda m:m[0]+" | default: '"+value+"'",body)
 new=body+'{% schema %}\n'+json.dumps(schema,indent=2)+'\n{% endschema %}'+s.split('{% endschema %}',1)[1]
 if new!=p.read_text():p.write_text(new)
