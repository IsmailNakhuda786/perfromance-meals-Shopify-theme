from pathlib import Path
import json
root=Path('theme')
s=root/'snippets/context-navigation.liquid'
s.write_text('''{% doc %}
Contextual brand navigation using merchant-configured destinations.
@param {string} brand - Current brand key
@param {string} mode - desktop or mobile
@param {object} config - Header section settings
{% enddoc %}
{% liquid
 assign link_class = 'text-[11px] tracking-[0.16em] uppercase font-semibold text-white/45 hover:text-white transition-colors'
 if mode == 'mobile'
  assign link_class = 'block w-full text-left py-3 px-3 text-[15px] text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5'
 endif
%}
{% if brand == 'rs' %}
<a class="{{ link_class }}" href="{{ config.ready_series_url | default: '/pages/ready-series' }}">{{ 'navigation.overview' | t }}</a>
<a class="{{ link_class }}" href="{{ config.ready_series_about_url | default: '/pages/ready-series-about' }}">{{ 'navigation.brand_about' | t }}</a>
<a class="{{ link_class }}" href="{{ config.ready_series_order_url | default: '/collections/ready-series' }}">{{ 'navigation.order' | t }}</a>
{% elsif brand == 'mp' %}
<a class="{{ link_class }}" href="{{ config.meal_plan_url | default: '/pages/meal-plan' }}">{{ 'navigation.overview' | t }}</a>
<a class="{{ link_class }}" href="{{ config.meal_plan_about_url | default: '/pages/meal-plan-about' }}">{{ 'navigation.brand_about' | t }}</a>
<a class="{{ link_class }}" href="{{ config.meal_plan_order_url | default: '/pages/meal-plan-builder' }}">{{ 'navigation.order' | t }}</a>
<a class="{{ link_class }}" href="{{ config.meal_plan_stories_url | default: '/pages/meal-plan-stories' }}">{{ 'navigation.customer_stories' | t }}</a>
{% else %}
<a class="{{ link_class }}" href="{{ routes.root_url }}#our-brands">{{ 'navigation.our_brands' | t }}</a>
<a class="{{ link_class }}" href="{{ config.about_url | default: '/pages/about' }}">{{ 'navigation.about' | t }}</a>
{% endif %}
<a class="{{ link_class }}" href="{{ config.rewards_url | default: '/pages/rewards' }}">{{ 'navigation.rewards' | t }}</a>
{% for link in config.menu.links %}<a class="{{ link_class }}" href="{{ link.url }}">{{ link.title | escape }}</a>{% endfor %}
''')
p=root/'sections/header.liquid';s=p.read_text();start=s.index('    <div class="hidden lg:flex');end=s.index('    <div class="flex items-center gap-2',start);s=s[:start]+'''    <div class="hidden lg:flex items-center gap-6 flex-1 justify-end mr-4">{% render 'context-navigation', brand: brand, mode: 'desktop', config: section.settings %}</div>
'''+s[end:]
start=s.index('    <p class="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase py-2 mt-2">');end=s.index('    {% if shop.customer_accounts_enabled %}',start);s=s[:start]+"    {% render 'context-navigation', brand: brand, mode: 'mobile', config: section.settings %}\n"+s[end:];s=s.replace("default: '/collections/ready-series'","default: '/pages/ready-series'")
parts=s.split('{% schema %}');schema=json.loads(parts[1].split('{% endschema %}')[0]);schema['settings'] +=[{'type':'url','id':x,'label':label}for x,label in [('ready_series_about_url','Ready Series About'),('ready_series_order_url','Ready Series Order'),('meal_plan_about_url','Meal Plan About'),('meal_plan_order_url','Meal Plan Order'),('meal_plan_stories_url','Meal Plan Customer Stories')]];p.write_text(parts[0]+'{% schema %}\n'+json.dumps(schema,indent=2)+'\n{% endschema %}\n')
p=root/'locales/en.default.json';data=json.loads(p.read_text());data['navigation'].update(overview='Overview',brand_about='About',order='Order',customer_stories='Customer Stories');data['catalog'].update(mode_single='Individual Selection',mode_single_description='One-time · choose meals',mode_subscription_description='Recurring · 3 or 6 months');p.write_text(json.dumps(data,indent=2)+'\n')
p=root/'sections/main-collection.liquid';s=p.read_text().replace('pm-catalog bg-[#1A1A1A]','pm-catalog bg-[#071B35]').replace('rgba(16,16,16,.97),rgba(16,16,16,.90) 45%,rgba(16,16,16,.65) 75%,rgba(16,16,16,.3)','rgba(7,27,53,.98),rgba(7,27,53,.92) 45%,rgba(7,27,53,.68) 75%,rgba(7,27,53,.35)').replace('"default": "Everyday Momentum"','"default": "Order Ready Series · Choose one pathway"').replace('"default": "FROZEN AT PEAK."','"default": "YOUR FREEZER."').replace('"default": "READY ON DEMAND."','"default": "YOUR WAY."');s=s.replace('<a href="{{ routes.root_url }}" class="inline-flex','<a href="{{ section.settings.overview_url | default: \'/pages/ready-series\' }}" class="inline-flex').replace('← {{ shop.name | escape }}','← {{ \'catalog.ready_overview\' | t }}');parts=s.split('{% schema %}');schema=json.loads(parts[1].split('{% endschema %}')[0]);schema['settings'].append({'type':'url','id':'overview_url','label':'Ready Series overview'});p.write_text(parts[0]+'{% schema %}\n'+json.dumps(schema,indent=2)+'\n{% endschema %}\n')
p=root/'locales/en.default.json';data=json.loads(p.read_text());data['catalog']['ready_overview']='Ready Series overview';p.write_text(json.dumps(data,indent=2)+'\n')
p=Path('theme-tools/theme.css');p.write_text(p.read_text()+ '\n.ready-grid{background-image:linear-gradient(rgba(114,167,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(114,167,255,.16) 1px,transparent 1px);background-size:56px 56px}\n')
for name in ['home-hero','home-brands','home-experiences','home-closing']:
 p=root/'sections'/f'{name}.liquid';s=p.read_text().replace("default: '/collections/ready-series'","default: '/pages/ready-series'");p.write_text(s)
p=Path('docs/PUBLISHED-PROTOTYPE-REVIEW.md');s=p.read_text();s=s[:s.index('Ready Series term source:')]+'Ready Series billing was explicitly confirmed by the user: prepaid full 3- or 6-month term, monthly fulfillment, automatic renewal at term boundary. Monthly installments are prohibited.\n';p.write_text(s)
