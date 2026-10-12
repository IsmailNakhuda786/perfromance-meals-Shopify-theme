from pathlib import Path
import json,re,hashlib,shutil
root=Path.cwd(); theme=root/'theme'; inv=Path('/Users/admin/Documents/Codex/2026-10-08/referenced-chatgpt-conversation-this-is-an/work'); audit=json.loads((inv/'image-audit.json').read_text()); manifest=[]
def asset(photo):
 a=next(a for a in audit if photo in a['url']); b=(inv/'image-audit'/a['saved_as']).read_bytes(); assert hashlib.sha256(b).hexdigest()==a['sha256']; name='sync-'+a['saved_as'];(theme/'assets'/name).write_bytes(b);manifest.append(a|{'theme_asset':name});return name
def schema_edit(file,fn):
 p=theme/file;s=p.read_text();m=re.search(r'{% schema %}([\s\S]*?){% endschema %}',s);d=json.loads(m[1]);body=s[:m.start()];body,d=fn(body,d);p.write_text(body+'{% schema %}\n'+json.dumps(d,indent=2,ensure_ascii=False)+'\n{% endschema %}\n')
# Preserve uploaded merchant images: only change packaged fallbacks.
p=theme/'templates/index.json';d=json.loads(p.read_text());
for section in d['sections'].values():
 if section['type']=='home-experiences':
  for b in section['blocks'].values():
   ready='READY' in b['settings'].get('eyebrow','');b['settings']['fallback_image']=asset('1627662055794' if ready else '1636647511729');b['settings']['image_alt']='Ready Series for everyday routines' if ready else 'Meal Plan preparation and structure'
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
def home(body,schema):
 body=body.replace('alt="{{ block.settings.eyebrow | escape }}"','alt="{{ block.settings.image_alt | default: block.settings.eyebrow | escape }}"')
 schema['blocks'][0]['settings'].append({'type':'text','id':'image_alt','label':'Photograph description','default':'Performance Meals for everyday routines'})
 return body,schema
schema_edit('sections/home-experiences.liquid',home)
def about(body,schema):
 photos=[('approved-867a0019a97d.jpg','1641106598584','Real food for real routines'),('approved-4ad6c5a857a8.jpg','1490645935967','Fresh meal preparation'),('approved-3e9a1f3ddd03.jpg','1666819691666','Ready Series for everyday life')]
 for i,(old,photo,alt) in enumerate(photos):
  name=asset(photo);pattern=r'<img src="{{ \''+re.escape(old)+r'\' \| asset_url }}"[^>]+>'
  found=re.search(pattern,body);assert found
  tag=found[0].replace(old,name);tag=re.sub(r'alt="[^"]*"',f'alt="{{{{ section.settings.photo_{i}_alt | escape }}}}"',tag)
  height=420 if i==0 else 440
  body=body.replace(found[0],f"{{% if section.settings.photo_{i} != blank %}}{{{{ section.settings.photo_{i} | image_url: width: 1200 | image_tag: class: 'w-full object-cover', style: 'height:{height}px', loading: 'lazy', alt: section.settings.photo_{i}_alt }}}}{{% else %}}{tag}{{% endif %}}")
  schema['settings'] += [{'type':'image_picker','id':f'photo_{i}','label':f'Editorial photograph {i+1}'},{'type':'text','id':f'photo_{i}_alt','label':f'Photograph {i+1} description','default':alt}]
 return body,schema
schema_edit('sections/about.liquid',about)
# Ordering presentation: keep all native forms, allocations, filters and contents below hero.
def collection(body,schema):
 start=body.index('  <div class="relative overflow-hidden min-h-[75svh]');end=body.index("  {% assign promo_blocks",start)
 name=asset('1543352632')
 hero='''  <div class="pm-order-hero border-t-[3px] border-[#F5B300] bg-[#F7F2E8] text-[#1A1A1A]"><div class="max-w-[1440px] mx-auto grid lg:grid-cols-[0.88fr_1.12fr] min-h-[680px]">
    <div class="px-6 sm:px-10 lg:px-16 py-14 sm:py-18 lg:py-20 flex flex-col justify-center">{% render 'logos', brand: 'rs', size: 'md', variant: 'light' %}<p class="text-[10px] font-bold tracking-[0.2em] uppercase mt-10 mb-6">{{ section.settings.eyebrow | escape }}</p><h1 class="font-display text-[48px] sm:text-[64px] lg:text-[74px] font-black leading-[0.91] tracking-[-0.045em]">{{ section.settings.heading | escape }}<br><span class="text-[#F5B300]">{{ section.settings.accent_heading | escape }}</span></h1><div class="text-[#6F665D] text-[16px] sm:text-[17px] leading-relaxed mt-7 max-w-[480px]">{{ section.settings.description }}</div><a href="#Catalog-{{ section.id }}" class="self-start mt-9 rounded-full bg-[#1A1A1A] text-white pl-7 pr-2 py-2 inline-flex items-center gap-8 text-[11px] font-extrabold uppercase tracking-[0.16em]">{{ 'sync.choose_meals' | t }}<span class="w-10 h-10 rounded-full bg-[#F5B300] text-[#1A1A1A] flex items-center justify-center" aria-hidden="true">↓</span></a></div>
    <div class="relative min-h-[480px] lg:min-h-full">{% if hero_image %}{{ hero_image | image_url: width: 1600 | image_tag: widths: '750,1100,1600', sizes: '(min-width: 1024px) 55vw,100vw', class: 'absolute inset-0 w-full h-full object-cover', loading: 'eager' }}{% else %}<img src="{{ 'ASSET' | asset_url }}" alt="{{ 'sync.order_image' | t | escape }}" width="1600" height="900" class="absolute inset-0 w-full h-full object-cover" loading="eager">{% endif %}<span class="absolute top-6 right-6 bg-white rounded-full px-5 py-3 text-[10px] font-bold uppercase tracking-wider">{{ 'sync.singapore_pace' | t }}</span><div class="absolute bottom-6 left-5 right-5 sm:left-8 sm:right-8 rounded-2xl bg-white/90 backdrop-blur-md grid grid-cols-3 p-5 gap-4">{% assign labels = 'sync.pick_meals,sync.choose_bundle,sync.keep_stocked' | split: ',' %}{% for label in labels %}<div><p class="text-[10px] font-mono text-[#897F74]">0{{ forloop.index }}</p><p class="font-display text-[13px] sm:text-[16px] font-bold mt-2">{{ label | t }}</p></div>{% endfor %}</div></div>
  </div></div>
  {% unless purchase_mode == 'subscription' %}<div class="bg-white text-[#6F665D] border-b border-[#E8E2D9] px-6 py-4 text-[11px] text-center">{{ 'sync.delivery_checkout' | t }}</div>{% endunless %}
'''.replace('ASSET',name)
 body=body[:start]+hero+body[end:]
 body=body.replace('<nav class="bg-[#111] border-b border-white/8"','<nav class="pm-purchase-modes bg-white border-b border-[#E8E2D9]"')
 body=body.replace('class="shrink-0 px-5 sm:px-6 py-4 border-b-2','class="shrink-0 min-w-[190px] sm:min-w-[240px] px-5 sm:px-7 py-5 border-b-[3px]')
 body=body.replace('  <section class="py-16 bg-[#1A1A1A]','  <section class="pm-catalog-benefits py-16 bg-[#1A1A1A]')
 defaults={'eyebrow':'Fast food, properly done','heading':'Your freezer,','accent_heading':'ready for anything.','description':'<p>High-protein meals for Singapore’s fullest days. Pick your favourites, heat in minutes, and get on with what matters.</p>'}
 for st in schema['settings']:
  if st.get('id') in defaults:st['default']=defaults[st['id']]
 for t in ['collection.ready-series','collection.bundles','collection.subscriptions']:
  p=theme/'templates'/f'{t}.json';d=json.loads(p.read_text());v=d['sections']['main']['settings'];v.update(defaults);v['palette']='dark' if 'subscriptions' in t else 'warm';p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
 return body,schema
schema_edit('sections/main-collection.liquid',collection)
# Native bundle quantities; no product mutations.
p=theme/'snippets/product-card.liquid';s=p.read_text();s=s.replace('{{ included_product.title | escape }}</li>','{{ included_product.title | escape }} ×{{ item.quantity.value }}</li>');p.write_text(s)
# Shared cart native contents, stream context and sticky summary.
p=theme/'snippets/cart-content.liquid';s=p.read_text().replace('data-cart-form>','data-cart-form class="pm-cart-form{% unless drawer %} pm-cart-page-form{% endunless %}">').replace('<div class="px-5 sm:px-6">','<div class="pm-cart-lines px-5 sm:px-6">',1).replace('<div class="p-5 sm:p-6 bg-[#161616]">','<div class="pm-cart-summary p-5 sm:p-6 bg-[#161616]">')
needle='{% unless item.product.has_only_default_variant %}'
addition='''{% assign stream = item.product.metafields.performance.business_stream.value %}{% if stream == 'meal_plan' %}<p class="text-[9px] font-bold uppercase tracking-widest text-[#E85D04] mt-2">{{ 'navigation.meal_plan' | t }}</p>{% elsif stream == 'ready_series' %}<p class="text-[9px] font-bold uppercase tracking-widest text-[#F5B300] mt-2">{{ 'catalog.ready_overview' | t }}</p>{% endif %}
              {% assign bundle_contents = item.variant.metafields.performance.bundle_contents.value | default: item.product.metafields.performance.bundle_contents.value %}{% if bundle_contents != blank %}<details class="mt-3 text-[11px] text-white/60"><summary class="cursor-pointer">{{ 'catalog.bundle_contents' | t }}</summary><div class="flex h-12 gap-1 mt-2">{% for part in bundle_contents limit: 5 %}{% assign meal = part.variant.value.product | default: part.product.value %}{% if meal.featured_image %}{{ meal.featured_image | image_url: width: 120 | image_tag: width: 48, height: 48, loading: 'lazy', class: 'w-12 h-12 object-cover' }}{% endif %}{% endfor %}</div><ul class="space-y-1 mt-2">{% for part in bundle_contents %}{% assign meal = part.variant.value.product | default: part.product.value %}{% if meal %}<li>{{ meal.title | escape }} ×{{ part.quantity.value }}</li>{% endif %}{% endfor %}</ul></details>{% endif %}
              '''
s=s.replace(needle,addition+needle,1);p.write_text(s)
# Footer and safe shared copy.
p=theme/'locales/en.default.json';loc=json.loads(p.read_text());loc['navigation']['footer_meal_plans']='Meal Plan';loc['sync']={'choose_meals':'Choose your meals','order_image':'Colourful Ready Series meals prepared for a busy week','singapore_pace':'Made for Singapore pace','pick_meals':'Pick your meals','choose_bundle':'Choose a bundle','keep_stocked':'Keep it stocked','delivery_checkout':'Delivery availability and charges are confirmed at checkout.','selected':'Selected','programme':'Recurring programme','programme_choose':'Choose your programme.','programme_copy':'Biweekly, Monthly, 2 Months, 6 by 60 and 6 by 60 Plus.','stories':'Explore illustrative customer journeys','rewards_pending':'Programme information — earning and redemption are not yet available.','bonus_scope':'Reward redemptions are bonus wallet value for Ready Series Individual Selection and Bundles only. They cannot pay for Ready Series Subscription or Meal Plan.','referral_pending':'Referral rewards will be confirmed before the programme launches.'};p.write_text(json.dumps(loc,indent=2,ensure_ascii=False)+'\n')
(root/'work/design-sync/shared-assets.json').write_text(json.dumps(manifest,indent=2))
