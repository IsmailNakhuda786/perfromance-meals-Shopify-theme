from pathlib import Path
import json,re
root=Path.cwd();theme=root/'theme'
def edit(file,fn):
 p=theme/file;s=p.read_text();m=re.search(r'{% schema %}([\s\S]*?){% endschema %}',s);d=json.loads(m[1]);body,d=fn(s[:m.start()],d);p.write_text(body+'{% schema %}\n'+json.dumps(d,indent=2,ensure_ascii=False)+'\n{% endschema %}\n')
def settings_update(handle,schema,updates):
 p=theme/'templates'/f'page.{handle}.json';t=json.loads(p.read_text());t['sections']['main']['settings'].update(updates)
 for st in schema['settings']:
  if st.get('id') in updates:st['default']=updates[st['id']]
 return p,t
names=['Biweekly','Monthly','2 Months','6 by 60','6 by 60 Plus'];keys=['biweekly','monthly','2months','6by60','6by60plus']
def meal(body,schema):
 start=body.index('<div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">');end=body.index('<section class="relative overflow-hidden bg-[#1A1A1A]">',start)
 cards='<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">'
 descriptions=['A two-week rhythm','A monthly rhythm','An extended rhythm','A focused 60-day programme','A 60-day programme with muscle support']
 for i,(name,key,desc) in enumerate(zip(names,keys,descriptions)):
  schema['settings'] += [{'type':'text','id':f'programme_{i}_name','label':name,'default':name},{'type':'textarea','id':f'programme_{i}_copy','label':name+' description','default':desc}]
  cards+=f'''<a href="/pages/meal-plan-builder?programme={key}" class="block p-6 border-2 border-[#E8E4DC] bg-white hover:border-[#E85D04] transition-colors"><h3 class="font-display text-[22px] font-bold mb-2">{{{{ section.settings.programme_{i}_name | escape }}}}</h3><p class="text-[13px] text-[#666] leading-relaxed">{{{{ section.settings.programme_{i}_copy | escape }}}}</p><p class="text-[10px] text-[#E85D04] uppercase tracking-widest mt-4">{{{{ 'sync.programme' | t }}}}</p></a>'''
 cards+='</div></div></section>'
 body=body[:start]+cards+body[end:];body=body.replace('?goal=MAINTAIN','').replace('href="/pages/about"','href="/pages/meal-plan-about"')
 marker='{% if section.settings.show_testimonials %}';start=body.index(marker);end=body.index('{% endif %}',start)+len('{% endif %}')
 # The conditional contains nested conditions; find outer end before cross-link section.
 end=body.index('<section class="py-10 px-6',start)
 region=body[start:end];split=region.index('<section class="py-16 px-6 sm:px-8 border-t')
 price=region[len(marker):split];body=body[:start]+price+'''<section class="py-16 px-6 bg-[#FAF9F6]"><div class="max-w-[1200px] mx-auto"><a class="font-display text-[24px] underline" href="/pages/meal-plan-stories">{{ 'sync.stories' | t }}</a></div></section>'''+body[end:]
 updates={'text_17':'Choose your programme.','text_36':'Choose a recurring programme for your routine.','text_40':'From choosing your programme to selecting your meals.','text_43':'Choose your programme','text_44':', '.join(names[:-1])+' and '+names[-1]+'.','text_48':'Choose from the available menu for your programme.','text_52':'Your programme’s delivery options are confirmed with your selection.','text_56':'Review your selections and programme details in one place.','text_57':'Explore the available programme and meal options.','text_55':'Review your plan','text_59':'Structured plans','text_60':'Explore your programme.','text_08':'Fresh','text_09':'Meal choices','text_10':'Planned','text_11':'Delivery rhythm'}
 p,t=settings_update('meal-plan',schema,updates)
 used=set(re.findall(r'section.settings.([\w]+)',body));schema['settings']=[st for st in schema['settings'] if st.get('id') in used];t['sections']['main']['settings']={k:v for k,v in t['sections']['main']['settings'].items() if k in used};p.write_text(json.dumps(t,indent=2,ensure_ascii=False)+'\n');return body,schema
edit('sections/meal-plan-landing.liquid',meal)
# Programme links select existing native configured products by approved name, never synthesize plans.
p=theme/'assets/meal-plan.js';s=p.read_text();s=s.replace("const goal = new URLSearchParams(window.location.search).get('goal');","const requestedProgramme = new URLSearchParams(window.location.search).get('programme');\n      const programmeNames = {biweekly:'Biweekly',monthly:'Monthly','2months':'2 Months','6by60':'6 by 60','6by60plus':'6 by 60 Plus'};")
s=s.replace('config.programmes.find((programme) => goal && programme.goal === goal)?.id','config.programmes.find((programme) => requestedProgramme && programme.name === programmeNames[requestedProgramme])?.id');p.write_text(s)
# Obsolete goal listeners only applied to the removed landing control.
p=theme/'assets/theme.js';s=p.read_text();print('goal handlers require review',s.count('data-goal'))
# Full rewards information available without pretending engine is active.
def rewards(body,schema):
 start=body.index('{% if section.settings.programme_active or request.design_mode %}');body=body[start+len('{% if section.settings.programme_active or request.design_mode %}'):];pos=body.rfind('{% endif %}');body=body[:pos]+body[pos+len('{% endif %}'):]
 body=body.replace('<div class="min-h-screen','{% unless section.settings.programme_active %}<p class="bg-[#F5B300] text-[#1A1A1A] px-6 py-4 text-center text-[12px]" role="status">{{ \'sync.rewards_pending\' | t }}</p>{% endunless %}\n<div class="min-h-screen',1)
 # Unsupported ancillary privileges and bonus decorations are removed, not invented.
 for n in [25,29,38,39,43,44,45,49,50,51]:
  key=f'text_{n:02}'
  body=re.sub(r'<(?:li|span)[^>]*>(?:(?!<(?:li|span)\b).)*?{{ section.settings.'+key+r' \| escape }}.*?</(?:li|span)>','',body,flags=re.S)
 updates={'text_04':'Earn points on every order, unlock tiers, and redeem for bonus wallet value on eligible Ready Series purchases.','text_05':'Explore Meal Plan →','text_15':'Keep points active by ordering at least once every 90 days.','text_17':'Redeem for bonus value','text_18':'Choose a bonus wallet tier: 500 pts = $5 · 1,000 pts = $11 · 2,000 pts = $25.','text_22':'Bonus wallet credit','text_26':'Bonus wallet credit','text_30':'Bonus wallet credit','text_31':'Reward redemptions are bonus wallet value for Ready Series Individual Selection and Bundles only. They cannot pay for Ready Series Subscription or Meal Plan.','text_55':'Earning and redemption become available when the rewards programme is activated.','text_57':'Order at least once every 90 days to keep points active.','text_61':'Referral rewards will be confirmed before the programme launches.','text_62':'Explore Performance Meals','text_64':'One customer account for your Performance Meals experience.'}
 p,t=settings_update('rewards',schema,updates)
 used=set(re.findall(r'section.settings.([\w]+)',body));schema['settings']=[st for st in schema['settings'] if st.get('id') in used];t['sections']['main']['settings']={k:v for k,v in t['sections']['main']['settings'].items() if k in used};p.write_text(json.dumps(t,indent=2,ensure_ascii=False)+'\n');return body,schema
edit('sections/rewards.liquid',rewards)
# Native denomination state is selected by the existing input, no new payment logic.
p=theme/'sections/gift-card-product.liquid';s=p.read_text();needle='{{ gift_option.price | money_without_trailing_zeros }}';s=s.replace(needle,needle+'<span class="block text-[9px] font-body opacity-0 peer-checked:opacity-100 pm-gift-selected">{{ \'sync.selected\' | t }}</span>');p.write_text(s)
