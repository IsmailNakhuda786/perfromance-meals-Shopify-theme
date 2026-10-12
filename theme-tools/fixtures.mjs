// Synthetic review data only. Nothing in this file is uploaded or written to Shopify.
const field = value => ({ value });
const fields = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, field(value)]));
export function createFixtures() {
  const image = { src: '/assets/ready-series-hero.jpg', width: 1600, height: 900, alt: 'Prepared meal' };
  const allocation = (id, name, price) => ({ selling_plan: { id, name, recurring_deliveries: true, selected: false, description: 'Billed each month. Manage through your subscription account.' }, price, per_delivery_price: price, checkout_charge_amount: price, compare_at_price: price + 1000 });
  const make = (id, handle, title, price, extra = {}) => {
    const variant = { id: id * 10, title: 'Regular', available: true, price, compare_at_price: null, options: ['Regular'], requires_selling_plan: false, quantity_rule: { min: 1, increment: 1, max: null }, selling_plan_allocations: [], featured_image: image, metafields: { performance: fields({ meals_per_day: 1 }) }, ...extra.variant };
    const product = { id, handle, title, description: '<p>Chef prepared meals for your everyday routine.</p>', url: `/products/${handle}`, object_type: 'product', available: true, price, price_min: price, price_varies: false, requires_selling_plan: false, gift_card: false, 'gift_card?': false, has_only_default_variant: false, options: ['Portion'], options_with_values: [{ name: 'Portion', values: ['Regular'] }], featured_image: image, images: [image], media: [{ ...image, media_type: 'image', preview_image: image }], variants: [variant], selected_or_first_available_variant: variant, metafields: { performance: fields({ business_stream: 'ready_series', prepaid_term_verified: true, category: 'High Protein', calories_kcal: 460, protein_g: 42, carbs_g: 38, fat_g: 16, sugar_g: 4, saturated_fat_g: 3, fibre_g: 7, sodium_mg: 640, badge: 'High Protein', ingredients: 'Chicken, rice, vegetables', allergens: 'Contains soy', preparation: 'Heat according to the label.', highlights: ['Chef prepared', 'Ready in minutes'], storage: 'Keep frozen', heat_method: 'Microwave', prep_time: '5 min', accent_color: '#F5B300' }) }, ...extra.product };
    product.type = extra.product?.type || '';
    return product;
  };
  const meals = [make(101, 'grilled-chicken', 'Grilled Chicken Rice', 1190), make(102, 'teriyaki-chicken', 'Teriyaki Chicken', 1290), make(103, 'salmon-bowl', 'Salmon Rice Bowl', 1490)];
  const soldOut = make(104, 'sold-out-meal', 'Sold Out Meal', 1190, { variant: { available: false }, product: { available: false } });
  const bundle = make(201, 'protein-bundle', 'Protein Bundle', 5990);
  Object.assign(bundle.metafields.performance, fields({ meal_count: 6, subscription_category: 'High Protein', bundle_contents: meals.map(product => ({ product: field(product), variant: field({ ...product.variants[0], product }), quantity: field(2) })) }));
  bundle.variants[0].selling_plan_allocations = [allocation(501, 'Monthly delivery', 5490), allocation(502, 'Fortnightly delivery', 5690)];
  const unavailableBundle = make(202, 'unconfigured-subscription', 'Subscription Coming Soon', 5990);
  const recurring = make(301, 'meal-plan-recurring', 'Meal Plan Subscription', 22000, { product: { requires_selling_plan: true }, variant: { requires_selling_plan: true, selling_plan_allocations: [allocation(601, 'Monthly programme', 22000)] } });
  const fixed = make(302, 'meal-plan-fixed', '4 Week Programme', 24000, { product: { requires_selling_plan: true }, variant: { requires_selling_plan: true, selling_plan_allocations: [allocation(602, 'Monthly programme', 24000)] } });
  for (const product of [recurring, fixed]) Object.assign(product.metafields.performance, fields({ business_stream: 'meal_plan', menu_weeks: 1, meals_per_day: 1, inclusions: ['Chef prepared meals', 'Published weekly menus', 'Delivery preferences'] }));
  const gift = make(401, 'gift-card', 'Performance Meals Gift Card', 5000, { product: { gift_card: true, 'gift_card?': true, options: ['Amount'] } });
  gift.metafields.performance.business_stream = { value: 'shared', type: 'single_line_text_field' };
  gift.variants = [25, 50, 100, 150].map((amount, index) => ({ ...gift.variants[0], id: 4010 + index, title: `S$${amount}`, price: amount * 100, options: [`S$${amount}`] }));
  gift.selected_or_first_available_variant = gift.variants[1];
  const products = Object.fromEntries([...meals, soldOut, bundle, unavailableBundle, recurring, fixed, gift].map(product => [product.handle, product]));
  const collect = (handle, title, items) => ({ id: handle, handle, title, url: `/collections/${handle}`, description: '', products: items, products_count: items.length, all_products_count: items.length, filters: [], default_sort_by: 'manual', sort_by: 'manual', sort_options: [{ value: 'manual', name: 'Featured' }, { value: 'price-ascending', name: 'Price: low to high' }] });
  const collections = {
    'ready-series': collect('ready-series', 'Single Purchase', [...meals, soldOut]),
    'ready-series-bundles': collect('ready-series-bundles', 'Bundles', [bundle]),
    'ready-series-subscriptions': collect('ready-series-subscriptions', 'Subscription', [bundle, unavailableBundle])
  };
  const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const windows = [{ ...fields({ business_stream: 'meal_plan', key: 'monday', label: 'Monday delivery', days: 3, meals }), system: { handle: 'monday' } }, { ...fields({ business_stream: 'meal_plan', key: 'thursday', label: 'Thursday delivery', days: 2, meals }), system: { handle: 'thursday' } }];
  const weeks = [{ ...fields({ business_stream: 'meal_plan', label: 'Next week', starts_on: day(7), ends_on: day(13), cutoff_at: new Date(Date.now() + 5 * 86400000).toISOString(), programmes: [recurring, fixed], windows }), system: { handle: 'next-week' } }];
  return { products, collections, meals, bundle, recurring, fixed, gift, metaobjects: { performance_menu_week: { values: weeks } }, customer: { first_name: 'Review', name: 'Review Customer', email: 'review@example.test', default_address: null } };
}
