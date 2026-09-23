/**
 * Curated healthier swaps, by food name (the same names as the seed list; ids are derived with
 * `slug`). These are the swaps a dietitian would actually suggest for South Indian eating — like
 * for like where possible, so the suggestion fits the same meal. The engine test checks every
 * name here resolves to a real food.
 */
export const SWAPS_BY_NAME: Record<string, string[]> = {
  // Tiffin
  Parotta: ["Phulka (no oil)", "Chapati", "Wheat parotta"],
  "Chilli parotta": ["Chapati", "Phulka (no oil)"],
  "Kothu parotta": ["Wheat dosa", "Chapati"],
  "Chicken kothu parotta": ["Egg dosa", "Chapati"],
  Poori: ["Phulka (no oil)", "Chapati"],
  "Medu vada": ["Idli", "Ragi idli", "Pesarattu"],
  "Masala vada (paruppu vadai)": ["Sundal (channa)", "Idli"],
  "Ghee roast dosa": ["Plain dosa", "Ragi dosa", "Pesarattu"],
  "Paper roast dosa": ["Plain dosa", "Ragi dosa", "Pesarattu"],
  "Masala dosa": ["Plain dosa", "Ragi dosa", "Pesarattu"],
  "Rava dosa": ["Ragi dosa", "Oats dosa"],
  "Podi dosa": ["Ragi dosa", "Plain dosa"],
  "Ven pongal": ["Rava upma", "Idli"],
  "Kanchipuram idli": ["Idli", "Ragi idli"],
  "Idli podi with oil": ["Sambar", "Tomato chutney", "Mint chutney"],
  "Coconut chutney": ["Tomato chutney", "Mint chutney", "Sambar"],

  // Rice
  "Cooked white rice": ["Kerala matta rice, cooked", "Cooked brown rice", "Foxtail millet, cooked"],
  "Ghee rice": ["Jeera rice", "Veg pulao"],
  "Coconut rice": ["Lemon rice", "Curd rice"],
  "Chicken biryani": ["Chicken tikka", "Dal khichdi"],
  "Mutton biryani": ["Chicken biryani", "Chicken tikka"],
  "Fried rice": ["Veg pulao", "Dal khichdi"],
  "Chicken fried rice": ["Chicken tikka", "Veg pulao"],

  // Curries
  "Paneer butter masala": ["Palak paneer", "Paneer tikka", "Kadai paneer"],
  "Butter chicken": ["Chicken tikka", "Chicken curry"],
  "Mutton curry": ["Chicken curry", "Fish curry"],
  "Mutton chukka": ["Pepper chicken, dry", "Chicken chukka"],
  "Chicken 65": ["Tandoori chicken", "Chicken tikka", "Pepper chicken, dry"],
  "Chilli chicken": ["Tandoori chicken", "Chicken tikka"],
  "Fish fry": ["Meen pollichathu", "Fish curry"],
  "Nethili (anchovy) fry": ["Fish curry", "Meen pollichathu"],
  "Potato fry (urulai varuval)": ["Beans poriyal", "Cabbage poriyal", "Carrot beans poriyal"],
  "Omelette (2 eggs, oil)": ["Egg, whole boiled", "Egg white"],
  "Fried egg (bullseye)": ["Egg, whole boiled"],

  // Breads
  "Bread slice, white": ["Bread slice, brown"],
  "Butter naan": ["Tandoori roti", "Chapati"],
  Naan: ["Tandoori roti", "Chapati"],
  Bhatura: ["Chapati", "Tandoori roti"],
  "Plain paratha": ["Chapati", "Phulka (no oil)"],
  "Aloo paratha": ["Chapati", "Jowar roti"],

  // Snacks
  Samosa: ["Sundal (channa)", "Dhokla", "Sweet corn, boiled"],
  "Onion bajji": ["Sundal (channa)", "Sweet corn, boiled"],
  "Onion pakoda": ["Sundal (channa)", "Makhana, roasted"],
  Bonda: ["Sundal (channa)", "Idli"],
  Mixture: ["Makhana, roasted", "Roasted groundnuts"],
  Murukku: ["Makhana, roasted", "Roasted groundnuts"],
  "Kara boondi": ["Makhana, roasted"],
  "Ribbon pakoda": ["Makhana, roasted"],
  "Potato chips": ["Makhana, roasted", "Sweet corn, boiled"],
  "Banana chips": ["Makhana, roasted", "Banana"],
  "French fries": ["Sweet corn, boiled", "Makhana, roasted"],
  "Marie biscuit": ["Makhana, roasted", "Roasted groundnuts"],
  "Parle-G biscuit": ["Makhana, roasted", "Banana"],
  "Cream biscuit": ["Makhana, roasted", "Dates"],
  "Butter cookies": ["Makhana, roasted", "Dates"],
  "Instant noodles, cooked": ["Poha (aval upma)", "Semiya upma"],
  "Egg puff": ["Bread omelette", "Egg, whole boiled"],
  "Veg puff": ["Veg grilled sandwich", "Dhokla"],
  "Chicken puff": ["Chicken tikka", "Bread omelette"],
  "Vada pav": ["Dhokla", "Poha (aval upma)"],

  // Fast food
  "Veg burger": ["Veg grilled sandwich"],
  "Chicken burger": ["Chicken shawarma roll", "Chicken tikka"],
  "Veg pizza": ["Veg grilled sandwich"],
  "Chicken pizza": ["Chicken tikka", "Chicken shawarma roll"],
  "Gobi manchurian": ["Veg momos, steamed", "Aloo gobi"],

  // Sweets
  "Gulab jamun": ["Rasgulla", "Papaya", "Dates"],
  Jalebi: ["Dates", "Papaya"],
  "Mysore pak": ["Dates", "Dark chocolate 70%"],
  "Boondi laddu": ["Dates", "Peanut chikki"],
  "Rava laddu": ["Dates", "Banana"],
  "Besan laddu": ["Dates", "Roasted groundnuts"],
  "Kaju katli": ["Dates", "Cashews"],
  "Tirunelveli halwa": ["Dates", "Papaya"],
  "Carrot halwa": ["Carrot, raw", "Papaya"],
  Palkova: ["Greek yoghurt, plain", "Dates"],
  "Rava kesari": ["Banana", "Semiya payasam"],
  "Vanilla ice cream": ["Greek yoghurt, plain", "Mango"],
  Kulfi: ["Greek yoghurt, plain", "Mango"],
  "Cake, cream": ["Banana", "Dates"],
  Adhirasam: ["Dates", "Banana"],

  // Drinks
  "Cola soft drink": ["Buttermilk (neer mor)", "Tender coconut water", "Black coffee, no sugar"],
  "Energy drink": ["Black coffee, no sugar", "Tender coconut water"],
  "Mango drink, packaged": ["Mango", "Buttermilk (neer mor)"],
  "Sugarcane juice": ["Tender coconut water", "Buttermilk (neer mor)"],
  "Fresh orange juice": ["Orange"],
  "Mosambi juice": ["Orange"],
  "Tea with milk and sugar": ["Tea with milk, no sugar", "Green tea, no sugar"],
  "Coffee with milk and sugar": ["Black coffee, no sugar", "Tea with milk, no sugar"],
  "Filter coffee decoction with milk": ["Black coffee, no sugar", "Tea with milk, no sugar"],
  "Horlicks with milk": ["Milk, toned"],
  "Boost with milk": ["Milk, toned"],
  "Chocolate milkshake": ["Milk, toned", "Whey shake in water"],
  "Banana milkshake": ["Banana", "Milk, toned"],
  "Rose milk": ["Milk, toned", "Buttermilk (neer mor)"],
  "Badam milk": ["Milk, toned", "Almonds"],
  "Sweet lassi": ["Buttermilk (neer mor)", "Curd (dahi)"],
  "Mango lassi": ["Buttermilk (neer mor)", "Mango"],
  "Milk, full fat": ["Milk, toned", "Milk, skimmed"],

  // Fats and condiments
  Ghee: ["Coconut oil", "Cooking oil"],
  Butter: ["Peanut butter"],
  Mayonnaise: ["Mint chutney", "Curd (dahi)"],
  "Tomato ketchup": ["Mint chutney", "Tomato chutney"],
  "Appalam (fried)": ["Papad, roasted"],
};
