from pathlib import Path
import json
root=Path('theme')
p=root/'snippets/context-navigation.liquid'
s=p.read_text();s=s[:s.index('<a class="{{ link_class }}" href="{{ config.rewards_url')]
import re
s=re.sub(r'<a class="\{\{ link_class \}\}" href="\{\{ (.*?) \}\}">(.*?)</a>',lambda m:"{% assign destination = "+m[1]+" %}\n{% render 'context-link', destination: destination, link_class: link_class, label: "+m[2][3:-3]+" %}",s)
p.write_text(s)
(root/'snippets/context-link.liquid').write_text('''{% doc %}
Renders an approved contextual destination with its active-page treatment.
@param {string} destination - Merchant configured destination
@param {string} link_class - Responsive navigation classes
@param {string} label - Translated link label
{% enddoc %}
{% assign active_path = destination | split: '#' | first %}
<a class="{{ link_class }}{% if request.path == active_path %} text-white{% endif %}" href="{{ destination }}"{% if request.path == active_path %} aria-current="page"{% endif %}>{{ label }}</a>
''')
p=root/'sections/header.liquid';s=p.read_text();s=s.replace("if request.path contains 'meal-plan'","if request.path contains 'meal-plan' or product.metafields.performance.business_stream.value == 'meal_plan'")
s=s.replace('transition-colors p-1" aria-label="{{ \'cart.title\'','transition-colors" aria-label="{{ \'cart.title\'')
s=s.replace("    {% render 'context-navigation', brand: brand, mode: 'mobile'",'''    <p class="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase py-2 mt-2">{{ brand_label }}</p>
    {% render 'context-navigation', brand: brand, mode: 'mobile' ''').replace("mode: 'mobile' ,", "mode: 'mobile',")
# Preserve real customer identity; match approved native logout placement.
needle="        {% else %}\n          <a href=\"{{ routes.account_login_url }}\""
s=s.replace(needle,'''          <a href="{{ routes.account_logout_url }}" class="hidden lg:flex items-center gap-1 border border-white/15 text-white/50 hover:border-white/40 hover:text-white transition-colors text-[10px] tracking-widest uppercase px-2.5 py-1.5" aria-label="{{ 'account.log_out' | t }}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>{{ 'account.out' | t }}</a>
        {% else %}
          <a href="{{ routes.account_login_url }}"''')
p.write_text(s)
p=root/'sections/footer.liquid';s=p.read_text();s=s.replace("{{ 'brands.ready_series' | t }}","{{ 'navigation.footer_ready_series' | t }}").replace("{{ 'brands.meal_plan' | t }}","{{ 'navigation.footer_meal_plans' | t }}")
s=re.sub(r"\{% if section.settings.menu != blank %\}.*?\{% endif %\}","",s)
p.write_text(s)
p=root/'locales/en.default.json';d=json.loads(p.read_text());d['navigation'].update(footer_ready_series='Ready Series',footer_meal_plans='Meal Plans');d['account']['out']='Out';p.write_text(json.dumps(d,indent=2)+'\n')
p=root/'templates/index.json';d=json.loads(p.read_text());b=d['sections']['brands']['blocks']['3']['settings'];b['label']='Explore Ready-Series';b['url']='/pages/ready-series'
for slide in d['sections']['hero']['blocks'].values():
 for key in ['primary_url','secondary_url']:
  if slide['settings'].get(key)=='/collections/ready-series':slide['settings'][key]='/pages/ready-series'
p.write_text(json.dumps(d,indent=2)+'\n')
