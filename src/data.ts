export type Page =
  | "home"
  | "ready-series"
  | "meal-plan-landing"
  | "meal-plan-wizard"
  | "checkout"
  | "confirmation"
  | "account"
  | "gift-card"
  | "handoff"
  | "blueprint"
  | "wireframe"
  | "about"
  | "screens-export"
  | "ready-series-product"
  | "rewards";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  img: string;
  type: "ready" | "box" | "plan";
  planLabel?: string;
  mealImgs?: string[];
  mealNames?: string[];
  mealCounts?: number[];
}

export interface Meal {
  id: number;
  name: string;
  cat: string;
  price: number;
  protein: number;
  carbs: number;
  fat: number;
  cal: number;
  rating: number;
  reviews: number;
  badge: string | null;
  img: string;
  desc: string;
}

export const MEALS: Meal[] = [
  {
    id: 1, name: "Herb Grilled Chicken & Brown Rice", cat: "high-carb",
    price: 12.40, protein: 42, carbs: 55, fat: 8, cal: 460,
    rating: 4.9, reviews: 284, badge: "Bestseller",
    img: "https://images.unsplash.com/photo-1670398564097-0762e1b30b3a?w=600&h=500&fit=crop&auto=format",
    desc: "Free-range chicken breast marinated overnight in rosemary, thyme, and lemon. Paired with nutty brown rice and steamed broccolini.",
  },
  {
    id: 2, name: "Chilli Lime Chicken & Cauliflower Rice", cat: "low-carb",
    price: 12.40, protein: 40, carbs: 14, fat: 10, cal: 310,
    rating: 4.8, reviews: 196, badge: "Low Carb",
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=500&fit=crop&auto=format",
    desc: "Zesty chilli-lime chicken thigh over riced cauliflower with pickled cucumber and sesame dressing.",
  },
  {
    id: 3, name: "Smoked Salmon Scrambled Eggs", cat: "breakfast",
    price: 11.90, protein: 28, carbs: 8, fat: 16, cal: 290,
    rating: 4.7, reviews: 143, badge: "Breakfast",
    img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&h=500&fit=crop&auto=format",
    desc: "Slow-scrambled free-range eggs with cold-smoked Atlantic salmon, capers, and dill.",
  },
  {
    id: 4, name: "Teriyaki Chicken & Jasmine Rice", cat: "high-carb",
    price: 12.40, protein: 38, carbs: 52, fat: 10, cal: 450,
    rating: 4.9, reviews: 312, badge: "New",
    img: "https://images.unsplash.com/photo-1772693471187-6e7d364f99ee?w=600&h=500&fit=crop&auto=format",
    desc: "House-made teriyaki glaze on grilled chicken, over fragrant jasmine rice with edamame and pickled ginger.",
  },
  {
    id: 5, name: "Korean BBQ Beef & Purple Rice", cat: "high-carb",
    price: 13.90, protein: 44, carbs: 58, fat: 12, cal: 510,
    rating: 4.8, reviews: 201, badge: null,
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=500&fit=crop&auto=format",
    desc: "Grass-fed beef in house gochujang marinade over antioxidant-rich purple rice with kimchi slaw.",
  },
  {
    id: 6, name: "Lemon Herb Turkey Breast", cat: "just-protein",
    price: 11.90, protein: 46, carbs: 6, fat: 6, cal: 270,
    rating: 4.7, reviews: 98, badge: "Just Protein",
    img: "https://images.unsplash.com/photo-1563438962385-0d3dd8319200?w=600&h=500&fit=crop&auto=format",
    desc: "Lean turkey breast, slow-roasted with lemon and herbs. 46g protein per serve. Zero filler.",
  },
  {
    id: 7, name: "Greek Chicken & Quinoa Bowl", cat: "low-carb",
    price: 12.40, protein: 38, carbs: 22, fat: 11, cal: 350,
    rating: 4.7, reviews: 155, badge: null,
    img: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600&h=500&fit=crop&auto=format",
    desc: "Lemon oregano chicken over tri-colour quinoa with cucumber, olives, and sun-dried tomato.",
  },
  {
    id: 8, name: "Overnight Protein Oats & Berries", cat: "breakfast",
    price: 9.90, protein: 22, carbs: 48, fat: 8, cal: 360,
    rating: 4.6, reviews: 88, badge: null,
    img: "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=600&h=500&fit=crop&auto=format",
    desc: "Cold-brew overnight oats with vanilla protein, blueberry compote, and toasted almonds.",
  },
  {
    id: 9, name: "Cajun Salmon & Sweet Potato Mash", cat: "high-carb",
    price: 13.90, protein: 40, carbs: 44, fat: 14, cal: 470,
    rating: 4.9, reviews: 267, badge: "Staff Pick",
    img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=500&fit=crop&auto=format",
    desc: "Atlantic salmon fillet with cajun spice crust, over whipped sweet potato and wilted spinach.",
  },
];

export const CATS = [
  { id: "all", label: "All Meals" },
  { id: "promotion", label: "🔥 Promotion" },
  { id: "bundles", label: "📦 Useful Bundles" },
  { id: "low-carb", label: "Low Carb" },
  { id: "high-carb", label: "High Carb" },
  { id: "breakfast", label: "Breakfast" },
  { id: "just-protein", label: "Just Protein" },
];

export const PROMOTIONS = [
  { id: 101, name: "SG61 Deal — Herb Chicken ×3", desc: "Our #1 bestseller at a special price. Use code SG61.", original: 37.20, sale: 28.90, saving: "22% OFF", img: "https://images.unsplash.com/photo-1670398564097-0762e1b30b3a?w=600&h=500&fit=crop&auto=format", tag: "Promo" },
  { id: 102, name: "Weekend Bundle — Mix of 4", desc: "Teriyaki, Korean BBQ, Cajun Salmon + Herb Chicken.", original: 52.60, sale: 39.90, saving: "24% OFF", img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=500&fit=crop&auto=format", tag: "Flash Sale" },
];

export const BUNDLES = [
  { id: 201, name: "Lean Starter Pack (5 meals)", desc: "Curated low-carb selection — perfect for first-timers.", price: 59.00, perMeal: 11.80, img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=500&fit=crop&auto=format", tag: "Popular", mealIds: [2, 7, 6, 3, 9] },
  { id: 202, name: "Bulk Performance Box (10 meals)", desc: "Mix of high-protein picks, best value per meal.", price: 109.00, perMeal: 10.90, img: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600&h=500&fit=crop&auto=format", tag: "Best Value", mealIds: [1, 2, 4, 5, 6, 7, 9, 3, 8, 1] },
  { id: 203, name: "Breakfast Week (7 meals)", desc: "Protein oats + salmon scramble — 7 mornings sorted.", price: 65.00, perMeal: 9.28, img: "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=600&h=500&fit=crop&auto=format", tag: "New", mealIds: [3, 8, 3, 8, 3, 8, 3] },
];

export type MealReview = { author: string; role: string; rating: number; text: string; date: string; verified: boolean };

export const ALL_REVIEWS: Record<number, MealReview[]> = {
  1: [
    { author: "Marcus T.", role: "Software Engineer", rating: 5, text: "Best meal prep chicken I have had. The brown rice keeps me full till 5pm and the herb marinade is genuinely restaurant-quality. I have ordered this 4 weeks in a row.", date: "12 Sep 2026", verified: true },
    { author: "Rena L.", role: "Marketing Manager", rating: 5, text: "Ordered 10 of these. Zero regrets. My whole office is jealous at lunchtime. The macros are spot-on every single time.", date: "8 Sep 2026", verified: true },
    { author: "Kevin P.", role: "Personal Trainer", rating: 4, text: "Really solid. Portion size is generous and macros match exactly as listed. Would be 5 stars if carbs were slightly lower for a cut phase.", date: "1 Sep 2026", verified: true },
    { author: "Alicia W.", role: "Nurse", rating: 5, text: "Works perfectly for my 12-hour shifts. Heat in 3 minutes, eat at the station, done. Consistent quality every week.", date: "29 Aug 2026", verified: true },
    { author: "Daniel F.", role: "CrossFit Coach", rating: 5, text: "I recommend this to every client who asks about meal prep. Clean ingredients, honest macros, great taste. Nothing like it in Singapore.", date: "22 Aug 2026", verified: true },
  ],
  2: [
    { author: "Sophie H.", role: "Product Designer", rating: 5, text: "The chilli lime dressing makes this. It actually has flavour — not just plain chicken on rice. Low carb without feeling like punishment.", date: "10 Sep 2026", verified: true },
    { author: "Jared Ng", role: "Entrepreneur", rating: 5, text: "I am on a cut and this is my go-to. 40g protein, under 315 cal, and it tastes good. That combination is rare in meal prep.", date: "5 Sep 2026", verified: true },
    { author: "Priya S.", role: "Doctor", rating: 4, text: "Good flavour and solid protein. I wish there were a bit more sauce but the macros are exactly what I need on a low-carb week.", date: "2 Sep 2026", verified: true },
    { author: "Brian K.", role: "Runner", rating: 5, text: "The pickled cucumber is a nice touch — it brightens the whole meal. Genuinely enjoyable and keeps me on track with my diet goals.", date: "28 Aug 2026", verified: true },
  ],
  3: [
    { author: "Vanessa C.", role: "Yoga Instructor", rating: 5, text: "A breakfast that actually keeps me full until noon. The salmon is cold-smoked properly — not the cheap kind. Feels like a cafe breakfast at home.", date: "9 Sep 2026", verified: true },
    { author: "James O.", role: "Architect", rating: 4, text: "I did not expect frozen scrambled eggs to be this good. The texture is right and the salmon quantity is generous. Will keep ordering.", date: "4 Sep 2026", verified: true },
    { author: "Linda T.", role: "Teacher", rating: 5, text: "Finally a healthy breakfast I actually look forward to. The capers add the perfect punch of flavour. My kids even steal it from the fridge.", date: "30 Aug 2026", verified: true },
  ],
  4: [
    { author: "Amir R.", role: "Finance Analyst", rating: 5, text: "The teriyaki glaze caramelises perfectly in the microwave. One of the best-tasting ready meals I have had, full stop. Premium quality.", date: "11 Sep 2026", verified: true },
    { author: "Lin Y.", role: "Pharmacist", rating: 5, text: "Excellent flavour, great macros, and the jasmine rice is actually fluffy after reheating. That is not easy to do. Five stars.", date: "7 Sep 2026", verified: true },
    { author: "Tom B.", role: "Sales Lead", rating: 4, text: "Genuinely delicious. My only feedback is I want a slightly larger portion — but the macros make sense for the size. Will keep buying.", date: "3 Sep 2026", verified: true },
    { author: "Sarah K.", role: "Physiotherapist", rating: 5, text: "Ordered as a bundle of 10. Three weeks in and I have not grown tired of it. The edamame and ginger really lift the whole thing.", date: "27 Aug 2026", verified: true },
  ],
  5: [
    { author: "Chris M.", role: "Gym Owner", rating: 5, text: "The gochujang marinade is deeply flavourful without being overwhelming. Purple rice is a nice nutritional upgrade. Solid high-carb option.", date: "8 Sep 2026", verified: true },
    { author: "Rachel T.", role: "Account Manager", rating: 5, text: "I meal prep for myself and my partner. This is both of our favourites. The kimchi slaw keeps it interesting and the beef quality is clearly high.", date: "2 Sep 2026", verified: true },
    { author: "Dylan W.", role: "Student Athlete", rating: 4, text: "Great macros for a build phase and the Korean flavours are authentic. I have had worse bulgogi at actual restaurants.", date: "28 Aug 2026", verified: true },
  ],
  6: [
    { author: "Natalie P.", role: "Dietitian", rating: 5, text: "As a dietitian I am picky about protein sources. This turkey breast is lean, well-seasoned, and the macros are genuinely clean. I recommend it to clients.", date: "10 Sep 2026", verified: true },
    { author: "Ethan G.", role: "Cyclist", rating: 4, text: "Clean, simple, high protein. Exactly what I need on recovery days when I want less carbs. The herb seasoning is subtle but good.", date: "6 Sep 2026", verified: true },
  ],
  7: [
    { author: "Jessica L.", role: "Content Creator", rating: 5, text: "The quinoa absorbs the lemon herb dressing beautifully. Light but filling — perfect for work-from-home lunches when I do not want to feel heavy.", date: "9 Sep 2026", verified: true },
    { author: "Paulo A.", role: "Project Manager", rating: 5, text: "My favourite low-carb option in the whole range. The Greek flavour profile — olives, feta, oregano — actually tastes Mediterranean. Impressive.", date: "5 Sep 2026", verified: true },
    { author: "Mei L.", role: "HR Manager", rating: 4, text: "Really enjoyable. Great for people who want flavour without a heavy meal. Would love a slightly larger portion of the quinoa component.", date: "1 Sep 2026", verified: true },
  ],
  8: [
    { author: "Felicia H.", role: "Early Childhood Educator", rating: 5, text: "I was sceptical about frozen protein oats but these are genuinely good. The berry mix is not too sweet and the oats have the right texture after a quick heat.", date: "7 Sep 2026", verified: true },
    { author: "Darren C.", role: "Swimmer", rating: 5, text: "This has replaced my usual breakfast smoothie. More filling, higher protein, less work. And it actually tastes good — not like cardboard.", date: "3 Sep 2026", verified: true },
    { author: "Anna K.", role: "Lawyer", rating: 4, text: "Great quick breakfast for busy mornings. I add a little extra honey sometimes. The protein content is impressive for a breakfast item.", date: "29 Aug 2026", verified: true },
  ],
  9: [
    { author: "Michael C.", role: "Triathlete", rating: 5, text: "The cajun seasoning on the salmon is bold without overpowering. Sweet potato mash is creamy and not mushy after reheating. Nutrition is excellent for endurance training.", date: "11 Sep 2026", verified: true },
    { author: "Grace T.", role: "Nurse Manager", rating: 5, text: "This is my weekly order. High protein, good fats from the salmon, complex carbs from the sweet potato. A nutritionally complete meal in one box.", date: "6 Sep 2026", verified: true },
    { author: "Ryan B.", role: "Structural Engineer", rating: 5, text: "The best fish meal prep option I have found in Singapore. The cajun spice level is perfect — noticeable but not burning. Restaurant quality.", date: "1 Sep 2026", verified: true },
  ],
  101: [
    { author: "Ryan T.", role: "Personal Trainer", rating: 5, text: "My go-to every week. The teriyaki glaze is spot-on and the brown rice keeps me full through afternoon sessions. Consistently excellent.", date: "11 Sep 2026", verified: true },
    { author: "Chloe L.", role: "Account Manager", rating: 5, text: "I order 10 of these a week for my meal prep. The macros are exactly as listed and the taste does not get old. Highly recommend.", date: "7 Sep 2026", verified: true },
    { author: "Brendan K.", role: "Marathon Runner", rating: 4, text: "Solid high-protein option. Great post-run meal. Would love slightly more rice for longer training days but the quality is undeniable.", date: "3 Sep 2026", verified: true },
    { author: "Mei R.", role: "Shift Nurse", rating: 5, text: "Three minutes in the microwave and I have a proper meal. Perfect for long hospital shifts. The teriyaki flavour is genuinely good.", date: "29 Aug 2026", verified: true },
  ],
  102: [
    { author: "Jason O.", role: "CrossFit Athlete", rating: 5, text: "The spice level is real — exactly what was advertised. Gochujang marinade is deep and flavourful. Best Korean-style meal prep I have tried.", date: "9 Sep 2026", verified: true },
    { author: "Siti K.", role: "Dietitian", rating: 5, text: "Impressive macros for a low-carb meal. The beef quality is clearly high. I recommend it to clients on a cut phase regularly.", date: "5 Sep 2026", verified: true },
    { author: "Mark C.", role: "Entrepreneur", rating: 4, text: "Great flavour and honest nutrition. Slightly too spicy for me but I keep coming back because nothing else in this range comes close.", date: "1 Sep 2026", verified: true },
  ],
  103: [
    { author: "Priscilla H.", role: "Yoga Teacher", rating: 5, text: "Light, clean, and genuinely tasty. The roasted vegetables do not turn mushy after reheating — that is impressive for a frozen meal.", date: "8 Sep 2026", verified: true },
    { author: "Nathan G.", role: "Physiotherapist", rating: 4, text: "Really solid low-carb option. The herb seasoning on the chicken is restrained but good. Wish the portion was slightly bigger.", date: "4 Sep 2026", verified: true },
  ],
  104: [
    { author: "Amanda C.", role: "Swimmer", rating: 5, text: "The salmon is perfectly cooked even after freezing. The quinoa absorbs the lemon-tahini dressing beautifully. This is genuinely premium.", date: "10 Sep 2026", verified: true },
    { author: "Wei T.", role: "Software Engineer", rating: 5, text: "44g protein in one frozen meal is remarkable. And it actually tastes like food, not cardboard. This is now my Monday staple.", date: "6 Sep 2026", verified: true },
    { author: "Grace P.", role: "Doctor", rating: 5, text: "As someone who cares about ingredient quality, this stands out. Good fat profile from the salmon, clean carbs from the quinoa. Perfect.", date: "2 Sep 2026", verified: true },
  ],
  105: [
    { author: "Daniel W.", role: "Graphic Designer", rating: 5, text: "The Thai basil flavour is authentic — not a watered-down version. Perfect for high-carb days. Fills me up without feeling heavy.", date: "7 Sep 2026", verified: true },
    { author: "Linda F.", role: "Teacher", rating: 4, text: "Great everyday meal. Bold flavours and good carbs. I would love it a little spicier but that is personal preference. Will keep buying.", date: "3 Sep 2026", verified: true },
  ],
  106: [
    { author: "Marcus D.", role: "Finance Director", rating: 5, text: "The miso glaze caramelises perfectly in the microwave. The soba is not overcooked. This is genuinely restaurant-quality. The premium price is completely justified.", date: "11 Sep 2026", verified: true },
    { author: "Cheryl T.", role: "Surgeon", rating: 5, text: "I eat this after late clinic sessions. Premium salmon, great macros, three minutes. It is the best meal I can have at 10pm with zero effort.", date: "8 Sep 2026", verified: true },
    { author: "Patrick N.", role: "Architect", rating: 5, text: "I was sceptical about frozen salmon but this has converted me completely. The texture is right and the miso is deeply flavourful. Five stars.", date: "4 Sep 2026", verified: true },
  ],
  107: [
    { author: "Felicia A.", role: "Early Childhood Educator", rating: 5, text: "Finally a healthy frozen breakfast. The berries are not too sweet and the oats keep me full until lunch. Perfect weekday breakfast.", date: "9 Sep 2026", verified: true },
    { author: "Tom S.", role: "Cyclist", rating: 4, text: "Good protein content for a breakfast meal. I eat it cold straight from the fridge and it is great. Warm is also good. Convenient and tasty.", date: "5 Sep 2026", verified: true },
  ],
  108: [
    { author: "Sarah J.", role: "Marketing Lead", rating: 5, text: "The tzatziki is the key — fresh and properly garlicky. The wholemeal wrap holds together well after reheating. My lunchtime favourite.", date: "8 Sep 2026", verified: true },
    { author: "Ravi M.", role: "Operations Manager", rating: 4, text: "Great lunchbox option. Leaner than my usual wrap and the flavours are clean. Would love slightly more chicken but overall very happy.", date: "4 Sep 2026", verified: true },
  ],
  109: [
    { author: "Nicole T.", role: "Content Creator", rating: 5, text: "I make avocado toast every morning but this is honestly better. The egg white texture after reheating is surprisingly good. My new weekday go-to.", date: "10 Sep 2026", verified: true },
    { author: "James P.", role: "Startup Founder", rating: 5, text: "Quick, clean, filling. This replaced my protein shake routine. I feel better and it actually tastes like something from a cafe.", date: "6 Sep 2026", verified: true },
    { author: "Aditi K.", role: "Lawyer", rating: 4, text: "Solid breakfast. The avocado portion could be a little more generous but the overall quality and speed of prep makes this a staple for me.", date: "2 Sep 2026", verified: true },
  ],
  110: [
    { author: "Faizal H.", role: "Personal Trainer", rating: 5, text: "Beef rendang done right. The spice base is proper — lemongrass, galangal, coconut — not a shortcut paste. Low carb without compromise.", date: "11 Sep 2026", verified: true },
    { author: "Tricia L.", role: "Nutritionist", rating: 5, text: "Recommending this to every client who wants low-carb comfort food. The rendang is rich and satisfying. Cauliflower rice works perfectly.", date: "7 Sep 2026", verified: true },
    { author: "Ryan B.", role: "IT Consultant", rating: 4, text: "The beef is tender and the flavour is authentic. I grew up eating rendang so my standard is high — this passes. Really impressed.", date: "3 Sep 2026", verified: true },
  ],
  111: [
    { author: "Chris V.", role: "University Student", rating: 5, text: "Best value meal in the range. The chipotle chicken and black beans are bold and filling. Great for post-gym carb loading.", date: "9 Sep 2026", verified: true },
    { author: "Jasmine R.", role: "Event Coordinator", rating: 4, text: "Really enjoyable and filling. The guacamole portion is small but the overall meal is good value. Will keep ordering on high-carb days.", date: "5 Sep 2026", verified: true },
  ],
  112: [
    { author: "Emily W.", role: "Nurse", rating: 5, text: "This is my every-week order. The prawn quality is noticeably good and the fried rice has proper wok flavour — not flat like most meal preps.", date: "10 Sep 2026", verified: true },
    { author: "Kevin S.", role: "Engineer", rating: 5, text: "26g protein in a fried rice is impressive. This is genuinely the best frozen fried rice I have had. It is a staple in my freezer now.", date: "7 Sep 2026", verified: true },
    { author: "Michelle T.", role: "HR Manager", rating: 5, text: "Simple, familiar, and consistently delicious. The spring onion keeps the flavour fresh. I have ordered this every week for two months.", date: "3 Sep 2026", verified: true },
    { author: "Darren F.", role: "Business Analyst", rating: 4, text: "Very satisfying and easy. The tiger prawns are the real highlight — larger than I expected for the price. Highly recommend as a weekly staple.", date: "29 Aug 2026", verified: true },
  ],
};

export const BOX_SIZES = [
  { qty: 5, label: "Starter", pricePerMeal: 12.40, total: 62.00, popular: false },
  { qty: 10, label: "Standard", pricePerMeal: 11.90, total: 119.00, popular: true },
  { qty: 15, label: "Pro", pricePerMeal: 11.50, total: 172.50, popular: false },
  { qty: 20, label: "Elite", pricePerMeal: 11.00, total: 220.00, popular: false },
];

export const PLANS = [
  {
    name: "CUT", cal: 1500, protein: 130, carbs: 120, fat: 45, meals: 3,
    priceWeek: 148, priceMonth: 520,
    desc: "Structured deficit for steady, sustainable fat loss without sacrificing muscle.",
    accent: "#CDFF3A",
  },
  {
    name: "MAINTAIN", cal: 2000, protein: 160, carbs: 190, fat: 60, meals: 4,
    priceWeek: 178, priceMonth: 625,
    desc: "Calibrated to your TDEE — optimal fueling for daily performance and recovery.",
    accent: "#F2C94C",
  },
  {
    name: "BUILD", cal: 2500, protein: 190, carbs: 260, fat: 75, meals: 5,
    priceWeek: 208, priceMonth: 729,
    desc: "Clean surplus with high-protein loading designed for serious muscle gain.",
    accent: "#7EE8B0",
  },
];
