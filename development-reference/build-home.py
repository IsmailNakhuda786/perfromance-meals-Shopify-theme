import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]/'theme'
def write(path,content):
    (root/path).write_text(content.strip()+'\n')
def field(id,default,label=None,type='text',**extras):
    value={'type':type,'id':id,'label':label or id.replace('_',' ').title(),**extras}
    if default is not None: value['default']=default
    return value
def section(name,markup,settings=None,blocks=None,max_blocks=None):
    schema={'name':name,'settings':settings or [],'presets':[{'name':name}]}
    if blocks: schema['blocks']=blocks
    if max_blocks: schema['max_blocks']=max_blocks
    return markup+'\n{% schema %}\n'+json.dumps(schema,indent=2)+'\n{% endschema %}'
def image(setting,fallback,classes,alt,loading='lazy'):
    return "{% if "+setting+" != blank %}{{ "+setting+" | image_url: width: 1800 | image_tag: class: '"+classes+"', loading: '"+loading+"', sizes: '(min-width: 1024px) 55vw, 100vw' }}{% else %}<img src=\"{{ '"+fallback+"' | asset_url }}\" alt=\"{{ "+alt+" | escape }}\" width=\"1200\" height=\"800\" loading=\""+loading+"\" class=\""+classes+"\">{% endif %}"

write(Path('snippets/logos.liquid'),r'''
{% doc %}
Renders the approved Performance Meals brand marks.
@param {string} [brand] - pm, mp, or rs.
@param {string} [size] - sm, md, or lg.
@param {string} [variant] - Original light, dark, or yellow color variant.
{% enddoc %}
{% liquid
  assign scale = 1
  if size == 'sm'
    assign scale = 0.65
  elsif size == 'lg'
    assign scale = 1.3
  endif
  assign text_color = '#1A1A1A'
  assign circle_color = '#F5B300'
  if brand == 'mp' or brand == 'rs'
    if variant == 'dark'
      assign text_color = '#FFFFFF'
    endif
  elsif variant == 'light'
    assign text_color = '#FFFFFF'
  endif
  if variant == 'yellow'
    assign circle_color = '#1A1A1A'
  endif
%}
{% if brand == 'mp' %}
<span class="inline-flex items-start gap-[10px] select-none" style="transform:scale({{ scale }});transform-origin:left center" aria-label="{{ 'brands.meal_plan' | t | escape }}">
  <span class="shrink-0 mt-[3px]" style="width:4px;background:#E85D04;align-self:stretch;min-height:38px"></span>
  <span class="flex flex-col leading-none">
    <span style="font-family:Outfit,sans-serif;font-weight:600;font-size:8px;letter-spacing:.25em;color:#E85D04;line-height:1;margin-bottom:4px">PERFORMANCE MEALS</span>
    <span style="font-family:Outfit,sans-serif;font-weight:900;font-style:italic;font-size:34px;letter-spacing:.01em;color:{{ text_color }};line-height:.88">MEAL PLAN</span>
    <svg width="130" height="7" viewBox="0 0 130 7" style="margin-top:4px" aria-hidden="true"><path d="M2 4.5 C25 2, 65 5.5, 95 3.5 C112 2.5, 124 4, 128 4.5" stroke="#E85D04" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></svg>
  </span>
</span>
{% elsif brand == 'rs' %}
<span class="inline-flex items-center gap-[11px] select-none" style="transform:scale({{ scale }});transform-origin:left center" aria-label="{{ 'brands.ready_series' | t | escape }}">
  <span class="shrink-0 w-[36px] h-[36px] rounded-full" style="background:{{ circle_color }}"></span>
  <span class="flex flex-col leading-none">
    <span style="font-family:Outfit,sans-serif;font-weight:800;font-style:italic;font-size:22px;letter-spacing:.02em;color:{{ text_color }};line-height:1">READY-SERIES</span>
    <span style="height:2px;background:#F5B300;margin:3px 0"></span>
    <span style="font-family:Outfit,sans-serif;font-weight:500;font-size:7.5px;letter-spacing:.22em;color:{{ text_color }};opacity:.55;line-height:1">by PERFORMANCE MEALS</span>
  </span>
</span>
{% else %}
<span class="inline-flex items-center gap-[10px] select-none" style="transform:scale({{ scale }});transform-origin:left center" aria-label="{{ 'brands.performance_meals' | t | escape }}">
  <span class="shrink-0 w-[34px] h-[34px] rounded-full" style="background:{{ circle_color }}"></span>
  <span class="flex flex-col leading-none">
    <span style="font-family:Outfit,sans-serif;font-weight:600;font-size:17px;letter-spacing:.18em;color:{{ text_color }};line-height:1">PERFORMANCE</span>
    <span class="my-[3px]" style="height:1.5px;background:#F5B300"></span>
    <span style="font-family:Outfit,sans-serif;font-weight:400;font-size:9px;letter-spacing:.35em;color:{{ text_color }};opacity:.7;line-height:1">MEALS</span>
  </span>
</span>
{% endif %}
''')

hero_settings=[field('standard','ONE TRUSTED STANDARD. TWO CLEAR OFFERS.'),field('autoplay',True,type='checkbox',label='Auto advance every five seconds')]
slide_fields=[field('eyebrow','PERFORMANCE MEALS / SINGAPORE'),field('heading','NUTRITION\nTHAT WORKS\nAS HARD\nAS YOU DO.',type='textarea'),field('body','Exceptional meals and thoughtful support that make healthy eating easier every day.',type='textarea'),field('image',None,type='image_picker'),field('image_alt','Performance Meals chef prepared food'),field('fallback_image','19606.png',type='select',options=[{'value':v,'label':l} for v,l in [('19606.png','Hero meal'),('98c55.png','Meal Plan'),('d006a.png','Ready Series')]]),field('primary_label','BROWSE READY SERIES'),field('primary_url','/collections/ready-series',type='url'),field('secondary_label',None),field('secondary_url',None,type='url')]
write(Path('sections/home-hero.liquid'),section('Homepage hero',r'''
<section class="relative bg-white overflow-hidden" data-home-hero data-autoplay="{{ section.settings.autoplay }}" aria-roledescription="{{ 'home.carousel' | t }}" aria-label="{{ 'home.featured' | t }}">
  <div class="flex flex-col lg:flex-row" style="min-height:clamp(500px,70vh,620px)">
    <div class="relative z-10 w-full lg:w-[53%] flex-shrink-0 px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-between order-2 lg:order-1" style="min-height:clamp(340px,50vw,560px)">
      <div>
        {% for block in section.blocks %}
        <div data-hero-slide data-index="{{ forloop.index0 }}" {% unless forloop.first %}hidden{% endunless %} {{ block.shopify_attributes }}>
          <p class="text-[#1A1A1A] text-[11px] font-medium tracking-[0.06em] mb-6 lg:mb-10">{{ block.settings.eyebrow | escape }}</p>
          {% if forloop.first %}<h1 class="font-display font-bold leading-[0.88] mb-5 lg:mb-6" style="font-size:clamp(32px,5vw,64px);letter-spacing:-.03em;color:#1A1A1A">{{ block.settings.heading | escape | newline_to_br }}</h1>{% else %}<h2 class="font-display font-bold leading-[0.88] mb-5 lg:mb-6" style="font-size:clamp(32px,5vw,64px);letter-spacing:-.03em;color:#1A1A1A">{{ block.settings.heading | escape | newline_to_br }}</h2>{% endif %}
          <p class="text-[#1A1A1A] leading-[1.45] mb-6 lg:mb-8 max-w-[440px]" style="font-size:clamp(13px,1.2vw,16px)">{{ block.settings.body | escape }}</p>
          <div class="flex flex-wrap gap-3 lg:gap-6 lg:pl-16">
            <a href="{{ block.settings.primary_url }}" class="group inline-flex items-center justify-center relative h-12 lg:h-14 px-7 lg:px-9 bg-[#1A1A1A] text-white text-[12px] lg:text-[13px] font-semibold tracking-[0.04em] rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_8px_28px_rgba(26,26,26,0.35)]"><span class="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span><span class="relative">{{ block.settings.primary_label | escape }}</span></a>
            {% if block.settings.secondary_label != blank and block.settings.secondary_url != blank %}<a href="{{ block.settings.secondary_url }}" class="group inline-flex items-center justify-center relative h-12 lg:h-14 px-7 lg:px-9 bg-[#E85D04] text-white text-[12px] lg:text-[13px] font-semibold tracking-[0.04em] rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_8px_28px_rgba(232,93,4,0.45)]"><span class="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span><span class="relative">{{ block.settings.secondary_label | escape }}</span></a>{% endif %}
        </div>
        {% endfor %}
      </div>
      <div class="mt-8 lg:mt-14 flex flex-col gap-3">
        <p class="text-[#7A7A75] text-[10px] lg:text-[11px] font-medium tracking-[0.034em]">{{ section.settings.standard | escape }}</p>
        <div class="flex items-center gap-3 lg:gap-4">
          <div class="relative h-[2px] w-[140px] lg:w-[240px] bg-[#1A1A1A]/15 rounded-full overflow-hidden"><div data-hero-progress class="absolute left-0 top-0 h-full bg-[#F5B300] rounded-full transition-all duration-300" style="width:{{ 100 | divided_by: section.blocks.size }}%"></div></div>
          <span data-hero-count class="text-[#7A7A75] text-[11px] font-medium">01 / 0{{ section.blocks.size }}</span>
          <button type="button" data-hero-pause class="text-[#7A7A75] text-[10px]" aria-label="{{ 'home.pause' | t }}" data-pause-label="{{ 'home.pause' | t }}" data-play-label="{{ 'home.play' | t }}">{{ 'home.auto' | t }}</button>
          <button type="button" data-hero-prev class="pm-hero-control" aria-label="{{ 'home.previous' | t }}">←</button><button type="button" data-hero-next class="pm-hero-control" aria-label="{{ 'home.next' | t }}">→</button>
        </div>
      </div>
    </div>
    <div class="hidden lg:block w-5 flex-shrink-0 bg-[#F5B300] z-10"></div>
    <div class="relative w-full lg:flex-1 order-1 lg:order-2 overflow-hidden" style="min-height:240px" data-hero-image>
      {% for block in section.blocks %}
        {% if block.settings.image != blank %}{% assign image_url = block.settings.image | image_url: width: 1800 %}{% else %}{% assign image_url = block.settings.fallback_image | asset_url %}{% endif %}
        <img src="{{ image_url }}" alt="{{ block.settings.image_alt | escape }}" width="1200" height="900" class="absolute inset-0 w-full h-full object-cover" data-hero-source data-index="{{ forloop.index0 }}" {% unless forloop.first %}hidden{% endunless %} {% if forloop.first %}fetchpriority="high"{% else %}loading="lazy"{% endif %}>
      {% endfor %}
      <div class="absolute inset-0 w-full h-full" data-hero-tiles aria-hidden="true" style="display:none;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(4,1fr)"></div>
    </div>
  </div>
</section>
{% stylesheet %}
.pm-hero-control{color:#7a7a75;font-size:15px;min-width:24px;min-height:24px}.pm-hero-control:hover{color:#1a1a1a}[data-hero-slide]{transition:opacity .5s ease,transform .5s ease}[data-home-hero][data-phase=exit] [data-hero-slide]{opacity:0;transform:translateY(10px)}
{% endstylesheet %}
''',hero_settings,[{'type':'slide','name':'Slide','settings':slide_fields}],5))

write(Path('sections/home-stats.liquid'),section('Homepage statistics',r'''
<div class="bg-[#F5B300] py-8 px-8 sm:px-16" data-home-stats>
  <div class="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
    {% for block in section.blocks %}<div class="flex flex-col gap-1 md:border-l md:first:border-l-0 border-[#1A1A1A]/15 md:pl-10 md:first:pl-0" {{ block.shopify_attributes }}>
      <span class="font-display font-extrabold text-[#1A1A1A] leading-none tabular-nums" style="font-size:clamp(24px,2.8vw,38px)"><span data-count-up="{{ block.settings.value }}">{{ block.settings.value }}</span>{{ block.settings.suffix | escape }}</span>
      <span class="font-mono text-[10px] tracking-[0.28em] uppercase text-[#1A1A1A]/60">{{ block.settings.label | escape }}</span>
    </div>{% endfor %}
  </div>
</div>
''',[],[{'type':'stat','name':'Statistic','settings':[field('value',0,type='number'),field('suffix',None),field('label','STATISTIC')]}],4))

standard_markup=r'''
<section class="bg-[#1A1A1A] overflow-hidden">
  <div class="flex flex-col lg:flex-row">
    <div class="flex-1 px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-16 flex flex-col justify-between"><div>
      <div class="flex items-baseline gap-5 mb-6"><span class="font-display font-bold text-[#F5B300]" style="font-size:clamp(36px,4vw,52px);line-height:1;letter-spacing:-.03em">{{ section.settings.number | escape }}</span><span class="text-[#F5B300] text-[10px] font-medium tracking-[0.05em]">{{ section.settings.eyebrow | escape }}</span></div>
      <h2 class="font-display font-bold text-white mb-5" style="font-size:clamp(28px,3.6vw,48px);line-height:.9;letter-spacing:-.023em">{{ section.settings.heading | escape | newline_to_br }}</h2>
      <p class="text-white/80 leading-[1.48] mb-5 max-w-[420px] text-[14px]">{{ section.settings.body | escape }}</p><p class="text-[#F5B300] text-[11px] font-medium tracking-[0.04em]">{{ section.settings.principles | escape }}</p>
    </div></div>
    <div class="relative lg:w-[55%] flex-shrink-0" style="min-height:320px">
      {% if section.settings.image != blank %}{{ section.settings.image | image_url: width: 1800 | image_tag: class: 'w-full h-full object-cover absolute inset-0', loading: 'lazy', sizes: '(min-width: 1024px) 55vw, 100vw' }}{% else %}<img src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1200&amp;h=590&amp;fit=crop&amp;auto=format" alt="{{ section.settings.image_alt | escape }}" width="1200" height="590" loading="lazy" class="w-full h-full object-cover absolute inset-0">{% endif %}
      <div class="absolute bottom-0 left-0 right-0 bg-[rgba(26,26,26,0.92)] px-5 sm:px-8 py-5 sm:py-7"><div class="grid grid-cols-3 gap-3 sm:gap-4">
        {% for block in section.blocks %}<div {{ block.shopify_attributes }}><p class="text-[#F5B300] text-[9px] tracking-[0.06em] mb-2">0{{ forloop.index }}</p><p class="text-white text-[11px] sm:text-[13px] font-medium leading-[1.1] mb-1 font-display">{{ block.settings.title | escape }}</p><p class="text-[#C2C2BA] text-[10px] sm:text-[11px] leading-[1.35] hidden sm:block">{{ block.settings.body | escape }}</p></div>{% endfor %}
      </div></div>
    </div>
  </div>
</section>
'''
write(Path('sections/home-standard.liquid'),section('The Performance standard',standard_markup,[field('number','01'),field('eyebrow','THE PARENT BRAND'),field('heading','THE STANDARD\nBEHIND EVERY\nMEAL.',type='textarea'),field('body','Performance Meals sets the purpose, quality standard and experience behind everything we offer.',type='textarea'),field('principles','PRINCIPLED  •  GROUNDED'),field('image',None,type='image_picker'),field('image_alt','Chef preparing meals')],[{'type':'principle','name':'Principle','settings':[field('title','CHEF-LED RECIPES'),field('body','Craft-led food.')]}],3))

experience_markup=r'''
<section class="bg-[#F7F4EB] overflow-hidden py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-16"><div class="max-w-[1380px] mx-auto">
  <div class="flex items-baseline gap-5 mb-4"><span class="font-display font-bold text-[#1A1A1A]" style="font-size:clamp(36px,4vw,52px);line-height:1;letter-spacing:-.03em">{{ section.settings.number | escape }}</span><span class="text-[#1A1A1A] text-[10px] sm:text-[11px] font-medium tracking-[0.05em]">{{ section.settings.eyebrow | escape }}</span></div>
  <h2 class="font-display font-bold text-[#1A1A1A] mb-4" style="font-size:clamp(28px,3.2vw,42px);line-height:.92;letter-spacing:-.021em">{{ section.settings.heading | escape | newline_to_br }}</h2><p class="text-[#7A7A75] leading-[1.45] mb-8 max-w-[440px] text-[14px]">{{ section.settings.body | escape }}</p>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {% for block in section.blocks %}<a href="{{ block.settings.url }}" class="pm-experience-card group overflow-hidden flex flex-col sm:flex-row" style="min-height:280px;--card-bg:{{ block.settings.background }};--card-text:{{ block.settings.foreground }};--card-accent:{{ block.settings.accent }}" {{ block.shopify_attributes }}>
      <div class="w-full sm:w-[42%] flex-shrink-0 relative overflow-hidden" style="min-height:200px">IMAGE</div>
      <div class="pm-experience-spine hidden sm:block flex-shrink-0" style="width:3px;background:var(--card-accent)"></div>
      <div class="flex-1 px-6 sm:px-8 py-6 sm:py-8 flex flex-col justify-between"><div>
        <p class="text-[11px] font-medium tracking-[0.06em] mb-4" style="color:var(--card-accent)">{{ block.settings.eyebrow | escape }}</p><h3 class="font-display font-bold mb-4" style="font-size:clamp(22px,2.4vw,36px);line-height:.92;letter-spacing:-.018em">{{ block.settings.heading | escape | newline_to_br }}</h3><p class="leading-[1.5] text-[14px] sm:text-[15px]" style="opacity:.7">{{ block.settings.body | escape }}</p>
      </div><span class="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.04em] transition-all duration-300 pt-5 mt-5" style="border-top:1px solid color-mix(in srgb,var(--card-text) 15%,transparent)"><span class="pm-experience-link">{{ block.settings.label | escape }}</span><span class="transition-transform duration-300 group-hover:translate-x-1">→</span></span></div>
    </a>{% endfor %}
  </div>
</div></section>
{% stylesheet %}
.pm-experience-card{background:var(--card-bg);color:var(--card-text);transition:box-shadow .4s ease,transform .4s cubic-bezier(.34,1.56,.64,1)}.pm-experience-card:hover,.pm-experience-card:focus-visible{transform:translateY(-6px);box-shadow:0 24px 60px #00000030}.pm-experience-spine{transition:width .4s ease}.pm-experience-card:hover .pm-experience-spine{width:5px!important}.pm-experience-link{position:relative;padding-bottom:3px}.pm-experience-link:after{position:absolute;bottom:0;left:0;height:1.5px;width:0;background:var(--card-accent);content:'';transition:width .3s}.pm-experience-card:hover .pm-experience-link{color:var(--card-accent)}.pm-experience-card:hover .pm-experience-link:after{width:100%}
{% endstylesheet %}
'''
experience_markup=experience_markup.replace('IMAGE',image('block.settings.image','d006a.png','w-full h-full object-cover absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105','block.settings.eyebrow').replace("{{ 'd006a.png' | asset_url }}","{{ block.settings.fallback_image | asset_url }}"))
write(Path('sections/home-experiences.liquid'),section('Choose your experience',experience_markup,[field('number','02'),field('eyebrow','ONE STANDARD. TWO DISTINCT EXPERIENCES.'),field('heading','CHOOSE HOW\nPERFORMANCE MEALS\nWORKS FOR YOU.',type='textarea'),field('body','Same belief. Same quality standard. Different jobs for different routines.',type='textarea')],[{'type':'experience','name':'Experience','settings':[field('eyebrow','READY SERIES'),field('heading','EVERYDAY\nMOMENTUM.',type='textarea'),field('body','Frozen convenience for changing schedules. Fast, flexible and dependable.',type='textarea'),field('label','EXPLORE READY SERIES'),field('url','/collections/ready-series',type='url'),field('image',None,type='image_picker'),field('fallback_image','d006a.png',type='select',options=[{'value':'d006a.png','label':'Ready Series'},{'value':'98c55.png','label':'Meal Plan'}]),field('background','#1A1A1A',type='color'),field('foreground','#FFFFFF',type='color'),field('accent','#F5B300',type='color')]}],2))

brands_markup=r'''
<section class="overflow-hidden" id="our-brands" data-home-brands>
  <div class="bg-white px-6 sm:px-10 pt-12 sm:pt-16 pb-8"><div class="max-w-[1200px] mx-auto">
    <div class="flex items-baseline gap-5 mb-5"><span class="font-display font-bold text-[#1A1A1A]" style="font-size:clamp(36px,4vw,52px);line-height:1;letter-spacing:-.03em">{{ section.settings.number | escape }}</span><span class="text-[#1A1A1A] text-[10px] sm:text-[11px] font-medium tracking-[0.05em]">{{ section.settings.eyebrow | escape }}</span></div>
    <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><h2 class="font-display font-extrabold text-[#1A1A1A] leading-[0.88]" style="font-size:clamp(32px,5vw,72px)">{{ section.settings.heading | escape }}<br><span class="text-[#F5B300]">{{ section.settings.heading_accent | escape }}</span></h2><p class="text-[#888] text-[14px] leading-relaxed max-w-[320px] lg:mb-2">{{ section.settings.body | escape }}</p></div>
  </div></div>
  <div class="flex flex-col lg:flex-row" style="min-height:520px" data-brand-panels>
    {% for block in section.blocks %}<div class="pm-brand-panel relative overflow-hidden flex flex-col justify-between" style="--brand-bg:{{ block.settings.background }};--brand-text:{{ block.settings.foreground }};--brand-accent:{{ block.settings.accent }};min-height:clamp(200px,40vw,520px);padding:clamp(28px,4vw,48px) clamp(20px,3.5vw,44px)" data-brand-panel {{ block.shopify_attributes }}>
      <div class="pm-brand-number absolute -bottom-6 -right-4 font-display font-extrabold select-none pointer-events-none" style="font-size:clamp(120px,18vw,220px);color:color-mix(in srgb,var(--brand-text) 5%,transparent);line-height:.85">0{{ forloop.index }}</div>
      <div><button type="button" data-brand-toggle aria-expanded="false" aria-controls="BrandDetails-{{ block.id }}" class="text-left w-full">
        <span class="flex items-center gap-3 mb-8"><span class="pm-brand-bar h-[2px]" style="background:var(--brand-accent);opacity:.6;width:32px"></span><span class="font-mono text-[10px] tracking-[0.4em] uppercase" style="opacity:.6">{{ block.settings.tag | escape }}</span></span><span class="pm-brand-logo">{% render 'logos', brand: block.settings.brand, size: 'md', variant: block.settings.logo_variant %}</span>
      </button></div>
      <div><h3 class="pm-brand-heading font-display font-extrabold leading-tight mb-4">{{ block.settings.heading | escape | newline_to_br }}</h3>
        <div class="pm-brand-details" id="BrandDetails-{{ block.id }}"><p class="text-[14px] leading-relaxed mb-6" style="opacity:.6">{{ block.settings.body | escape }}</p><div class="mb-7"><div class="font-display font-extrabold text-[22px] leading-none" style="color:var(--brand-accent)">{{ block.settings.stat | escape }}</div><div class="font-mono text-[9px] tracking-widest uppercase mt-1" style="opacity:.6">{{ block.settings.stat_label | escape }}</div></div></div>
        <a href="{{ block.settings.url }}" class="pm-brand-cta inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.18em] uppercase transition-colors {% if block.settings.brand == 'pm' %}border-b-2 border-[#1A1A1A]/30 text-[#1A1A1A] hover:border-[#F5B300] hover:text-[#F5B300]{% elsif block.settings.brand == 'mp' %}bg-white text-[#E85D04] hover:bg-[#1A1A1A] hover:text-white px-6 py-3.5{% else %}bg-[#1A1A1A] text-white hover:bg-white hover:text-[#1A1A1A] px-6 py-3.5{% endif %}">{{ block.settings.label | escape }}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
      </div>
    </div>{% endfor %}
  </div>
  <div class="bg-[#1A1A1A] px-6 sm:px-10 py-5"><div class="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p class="text-white/45 text-[12px] leading-relaxed"><span class="text-[#F5B300] font-semibold">{{ section.settings.footer_accent | escape }}</span> {{ section.settings.footer_body | escape }}</p><div class="flex gap-6">{% for block in section.blocks %}<a href="{{ block.settings.url }}" class="text-white/25 text-[10px] font-mono tracking-widest uppercase hover:text-white/60 transition-colors">{{ block.settings.short_label | escape }}</a>{% endfor %}</div></div></div>
</section>
{% stylesheet %}
.pm-brand-panel{background:var(--brand-bg);color:var(--brand-text);flex:1;transition:flex .55s cubic-bezier(.4,0,.2,1)}.pm-brand-heading{font-size:clamp(22px,2.2vw,30px);transition:font-size .4s ease}.pm-brand-details{max-height:200px;opacity:1;overflow:hidden;transition:max-height .5s cubic-bezier(.4,0,.2,1),opacity .4s ease}.pm-brand-cta{transition:opacity .35s ease .1s,transform .35s ease .1s}.pm-brands-enhanced .pm-brand-details{max-height:0;opacity:0}.pm-brands-enhanced .pm-brand-cta{opacity:0;transform:translateY(8px)}.pm-brand-panel:focus-within .pm-brand-details,.pm-brand-panel.is-active .pm-brand-details{max-height:250px;opacity:1}.pm-brand-panel:focus-within .pm-brand-cta,.pm-brand-panel.is-active .pm-brand-cta{opacity:1;transform:translateY(0)}.pm-brand-panel.is-active{flex:2.4}.pm-brand-panel.is-inactive{flex:.7}.pm-brand-panel.is-active .pm-brand-heading{font-size:clamp(28px,3vw,40px)}.pm-brand-panel.is-inactive .pm-brand-logo{opacity:.5}.pm-brand-panel.is-inactive .pm-brand-number{opacity:0}.pm-brand-panel.is-active .pm-brand-bar{width:48px!important}.pm-brand-bar,.pm-brand-logo,.pm-brand-number{transition:all .4s ease}
{% endstylesheet %}
'''
brand_fields=[field('brand','pm',type='select',options=[{'value':'pm','label':'Performance Meals'},{'value':'mp','label':'Meal Plan'},{'value':'rs','label':'Ready Series'}]),field('logo_variant','dark',type='select',options=[{'value':'dark','label':'Dark'},{'value':'light','label':'Light'},{'value':'yellow','label':'Yellow'}]),field('tag','The Parent Brand'),field('heading','Credible.\nCaring.\nPrincipled.',type='textarea'),field('body','Performance Meals sets the purpose, standards, and shared quality foundation that both brand experiences are built on. Every meal, every customer interaction begins here.',type='textarea'),field('stat','Est. 2019'),field('stat_label','Singapore'),field('label','Our Story'),field('short_label','PM'),field('url','/pages/about',type='url'),field('background','#F5F2EC',type='color'),field('foreground','#1A1A1A',type='color'),field('accent','#F5B300',type='color')]
write(Path('sections/home-brands.liquid'),section('Our brand family',brands_markup,[field('number','03'),field('eyebrow','OUR BRAND FAMILY'),field('heading','One Standard.'),field('heading_accent','Two Experiences.'),field('body','Tap each brand to explore its story — all built on the same trusted kitchen.',type='textarea'),field('footer_accent','One trusted kitchen.'),field('footer_body','A personalised fresh-plan or a fast, flexible frozen-meal experience.',type='textarea')],[{'type':'brand','name':'Brand','settings':brand_fields}],3))

mission_markup=r'''
<section class="bg-white overflow-hidden"><div class="flex flex-col lg:flex-row">
  <div class="lg:w-[47%] flex-shrink-0 relative" style="min-height:280px">IMAGE</div><div class="hidden lg:block w-5 flex-shrink-0 bg-[#F5B300]"></div>
  <div class="flex-1 px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-20 flex flex-col justify-center">
    <div class="flex items-baseline gap-5 mb-6"><span class="font-display font-bold text-[#F5B300]" style="font-size:clamp(36px,4vw,52px);line-height:1;letter-spacing:-.03em">{{ section.settings.number | escape }}</span><span class="text-[#1A1A1A] text-[11px] font-medium tracking-[0.05em]">{{ section.settings.eyebrow | escape }}</span></div>
    <h2 class="font-display font-bold text-[#1A1A1A] mb-8" style="font-size:clamp(36px,4.5vw,56px);line-height:.92;letter-spacing:-.022em">{{ section.settings.heading | escape | newline_to_br }}</h2><p class="text-[#7A7A75] leading-[1.5] mb-8 max-w-[500px]" style="font-size:clamp(14px,1.5vw,17px)">{{ section.settings.body | escape }}</p><div class="h-px bg-[#1A1A1A]/13 w-full max-w-[510px] mb-7"></div><p class="text-[#F5B300] text-[11px] font-medium tracking-[0.04em] mb-4">{{ section.settings.mission_label | escape }}</p><p class="text-[#1A1A1A] leading-[1.3] max-w-[500px] font-display" style="font-size:20px;font-weight:500;letter-spacing:-.003em">{{ section.settings.mission | escape }}</p>
  </div>
</div></section>
'''
mission_markup=mission_markup.replace('IMAGE',image('section.settings.image','13da6.png','w-full h-full object-cover absolute inset-0','section.settings.image_alt'))
write(Path('sections/home-mission.liquid'),section('Food first mission',mission_markup,[field('number','04'),field('eyebrow','FOOD FIRST. PERFORMANCE FOLLOWS.'),field('heading','CONVENIENCE\nWITHOUT\nCOMPROMISE.',type='textarea'),field('body','Convenient food should still respect the ingredients, the craft and the person eating it. That principle shapes every Performance Meals experience.',type='textarea'),field('mission_label','OUR MISSION'),field('mission','To deliver exceptional meals and thoughtful support that make healthy eating easier every day.',type='textarea'),field('image',None,type='image_picker'),field('image_alt','Performance Meals food')]))

write(Path('sections/home-closing.liquid'),section('Homepage closing',r'''
<section class="bg-[#F5B300] overflow-hidden px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 relative"><div class="max-w-[1380px] mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">
  <div class="max-w-[700px]"><p class="text-[#1A1A1A] text-[11px] font-medium tracking-[0.05em] mb-5">{{ section.settings.eyebrow | escape }}</p><h2 class="font-display font-bold text-[#1A1A1A] mb-6" style="font-size:clamp(36px,4vw,55px);line-height:.92;letter-spacing:-.021em">{{ section.settings.heading | escape | newline_to_br }}</h2><p class="text-[#1A1A1A] leading-[1.45] mb-10 max-w-[460px] text-[17px]">{{ section.settings.body | escape }}</p><div class="flex flex-wrap gap-3"><a href="{{ section.settings.primary_url }}" class="inline-flex items-center justify-center h-12 px-7 bg-[#1A1A1A] text-white text-[12px] font-medium tracking-[0.01em] rounded-full hover:bg-[#333] transition-colors">{{ section.settings.primary_label | escape }}</a><a href="{{ section.settings.secondary_url }}" class="inline-flex items-center justify-center h-12 px-7 bg-[#E85D04] text-white text-[12px] font-medium tracking-[0.01em] rounded-full hover:bg-[#c94e00] transition-colors">{{ section.settings.secondary_label | escape }}</a></div></div>
  <div class="lg:text-right"><p class="text-[#1A1A1A] text-[11px] font-medium tracking-[0.04em] mb-4 lg:text-right">{{ section.settings.principles | escape }}</p><div class="font-display font-bold text-[#1A1A1A] leading-[0.87]" style="font-size:clamp(36px,4vw,50px);letter-spacing:-.02em">{{ section.settings.wordmark | escape | newline_to_br }}</div></div>
</div></section>
''',[field('eyebrow','PERFORMANCE MEALS'),field('heading','ONE TRUSTED STANDARD.\nTWO WAYS TO LIVE IT.',type='textarea'),field('body','Choose the experience that fits the way you want to eat.',type='textarea'),field('primary_label','BROWSE READY SERIES'),field('primary_url','/collections/ready-series',type='url'),field('secondary_label','EXPLORE MEAL PLAN'),field('secondary_url','/pages/meal-plan-builder',type='url'),field('principles','PRINCIPLED  •  GROUNDED'),field('wordmark','PERFORMANCE\nMEALS',type='textarea')]))

def config(type,settings={},blocks=[]):
    return {'type':type,'settings':settings,**({'blocks':{str(i+1):{'type':t,'settings':s} for i,(t,s) in enumerate(blocks)},'block_order':[str(i+1) for i in range(len(blocks))]} if blocks else {})}
hero_blocks=[('slide',{'eyebrow':'PERFORMANCE MEALS / SINGAPORE','heading':'NUTRITION\nTHAT WORKS\nAS HARD\nAS YOU DO.','body':'Exceptional meals and thoughtful support that make healthy eating easier every day.','fallback_image':'19606.png','primary_label':'BROWSE READY SERIES','primary_url':'/collections/ready-series','secondary_label':'EXPLORE MEAL PLAN','secondary_url':'/pages/meal-plan-builder'}),('slide',{'eyebrow':'PERFORMANCE MEALS / MEAL PLAN','heading':'FRESH STRUCTURE,\nPERSONAL\nGUIDANCE,\nREAL RESULTS.','body':'A structured fresh-meal plan with real check-ins and support around your goal.','fallback_image':'98c55.png','primary_label':'EXPLORE MEAL PLAN','primary_url':'/pages/meal-plan-builder'}),('slide',{'eyebrow':'PERFORMANCE MEALS / READY-SERIES','heading':'FROZEN.\nMACRO-TRACKED.\nZERO\nCOMPROMISE.','body':'40+ chef-prepared frozen meals for busy weeks. Fast, flexible, and dependable.','fallback_image':'d006a.png','primary_label':'EXPLORE READY SERIES','primary_url':'/collections/ready-series'})]
stats_blocks=[('stat',{'value':v,'suffix':s,'label':l}) for v,s,l in [(8400,'+','ACTIVE CUSTOMERS'),(40,'+','READY MEALS'),(3,' min','READY TO EAT'),(2,'','MAIN JOURNEYS')]]
principle_blocks=[('principle',{'title':t,'body':b}) for t,b in [('CHEF-LED RECIPES','Craft-led food.'),('CLEAR NUTRITION','Visible macros & ingredients.'),('QUALITY CONTROL','Kitchen to doorstep.')]]
experience_blocks=[('experience',{}),('experience',{'eyebrow':'MEAL PLAN','heading':'BOUTIQUE\nPROGRESS.','body':'Fresh structure, personal guidance and support around a clear goal.','label':'EXPLORE MEAL PLAN','url':'/pages/meal-plan-builder','fallback_image':'98c55.png','background':'#FFFFFF','foreground':'#1A1A1A','accent':'#E85D04'})]
brand_blocks=[('brand',{}),('brand',{'brand':'mp','logo_variant':'light','tag':'Boutique Progress','heading':'Fresh structure\nfor your\npersonal goal.','body':'Tailored support, real check-ins, and meaningful results. Designed for people who want more than a generic routine — built around your goal, delivered fresh daily.','stat':'6–12 wks','stat_label':'Avg transformation','label':'Discover Meal Plan','short_label':'Meal Plan','url':'/pages/meal-plan','background':'#E85D04','foreground':'#FFFFFF','accent':'#FFFFFF'}),('brand',{'brand':'rs','logo_variant':'light','tag':'Everyday Momentum','heading':'Ready for\nreal life.','body':'Fast, enjoyable frozen meals built to keep your week moving without locking you in. Dependable, repeat-friendly, and zero compromise on nutrition.','stat':'40+','stat_label':'Macro-tracked meals','label':'Shop Ready-Series','short_label':'Ready','url':'/collections/ready-series','background':'#F5B300','foreground':'#1A1A1A','accent':'#1A1A1A'})]
sections={'hero':config('home-hero',blocks=hero_blocks),'stats':config('home-stats',blocks=stats_blocks),'standard':config('home-standard',blocks=principle_blocks),'experiences':config('home-experiences',blocks=experience_blocks),'brands':config('home-brands',blocks=brand_blocks),'mission':config('home-mission'),'closing':config('home-closing')}
write(Path('templates/index.json'),json.dumps({'sections':sections,'order':list(sections)},indent=2))
