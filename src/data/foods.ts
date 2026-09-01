import type { Food, Macros, Micros, Portion, Unit } from "@/lib/types";
import { slug } from "@/lib/utils/id";

/**
 * Seed food database, weighted towards South Indian home and mess food.
 *
 * Values are per 100 g (or 100 ml) and come from IFCT 2017 / ICMR-NIN tables and USDA
 * FoodData Central, adjusted for typical restaurant and home preparation. Cooked dishes vary
 * enormously with oil use, so treat these as good estimates rather than measurements — every
 * one of them is editable, and anything you weigh yourself will always beat a table.
 *
 * Tuple order: name, category, kcal, protein, carbs, fat, fiber, portions, unit, sugar, sodium
 * Portion syntax: "label=grams" separated by "|". The first portion is the default.
 * `null` means the value is genuinely unknown and must not be displayed as zero.
 */
type Seed = [
  name: string,
  category: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number | null,
  portions: string,
  unit?: Unit,
  sugar?: number | null,
  sodium?: number | null,
];

const SEEDS: Seed[] = [
  // ---- South Indian tiffin ----
  ["Idli", "South Indian", 145, 4.0, 30.0, 0.7, 1.4, "1 idli=40|2 idli=80|3 idli=120|100 g=100"],
  ["Plain dosa", "South Indian", 166, 3.4, 27.5, 4.6, 1.3, "1 dosa=80|1 large dosa=110|100 g=100"],
  ["Masala dosa", "South Indian", 167, 3.1, 25.3, 6.0, 2.1, "1 dosa=150|100 g=100"],
  ["Ghee roast dosa", "South Indian", 232, 3.6, 30.0, 10.8, 1.3, "1 dosa=110|100 g=100"],
  ["Rava dosa", "South Indian", 205, 3.8, 27.0, 9.0, 1.2, "1 dosa=100|100 g=100"],
  ["Set dosa", "South Indian", 178, 4.2, 28.0, 5.4, 1.5, "1 dosa=60|3 dosa=180"],
  ["Uttapam", "South Indian", 165, 4.0, 25.0, 5.5, 1.8, "1 uttapam=100|100 g=100"],
  ["Medu vada", "South Indian", 295, 7.3, 31.0, 15.5, 3.0, "1 vada=45|2 vada=90|100 g=100"],
  ["Ven pongal", "South Indian", 180, 4.3, 25.6, 6.4, 1.6, "1 cup=180|100 g=100"],
  ["Rava upma", "South Indian", 145, 3.4, 21.8, 4.6, 1.5, "1 cup=170|100 g=100"],
  ["Idiyappam", "South Indian", 180, 3.4, 39.0, 0.5, 1.2, "1 idiyappam=50|3 idiyappam=150"],
  ["Appam", "South Indian", 200, 3.0, 40.0, 3.2, 1.0, "1 appam=60|2 appam=120"],
  ["Puttu", "South Indian", 145, 3.2, 30.0, 1.4, 2.2, "1 cylinder=120|100 g=100"],
  ["Kal dosa", "South Indian", 175, 3.6, 28.0, 5.0, 1.3, "1 dosa=70|100 g=100"],
  ["Parotta", "South Indian", 330, 6.4, 45.0, 13.5, 1.8, "1 parotta=90|2 parotta=180"],
  ["Kothu parotta", "South Indian", 215, 7.5, 24.0, 10.0, 1.6, "1 plate=250|100 g=100"],
  ["Chapati", "Breads", 260, 8.0, 45.0, 5.8, 5.0, "1 chapati=40|2 chapati=80|100 g=100"],
  ["Phulka (no oil)", "Breads", 240, 8.4, 48.0, 1.6, 5.4, "1 phulka=35|2 phulka=70"],
  ["Poori", "Breads", 335, 6.5, 40.0, 16.5, 2.2, "1 poori=30|2 poori=60"],
  ["Naan", "Breads", 290, 8.5, 48.0, 6.5, 2.0, "1 naan=90|100 g=100"],
  ["Bread slice, white", "Breads", 265, 8.8, 49.0, 3.3, 2.4, "1 slice=25|2 slices=50"],

  // ---- Rice and rice meals ----
  ["Cooked white rice", "Rice", 130, 2.7, 28.2, 0.3, 0.4, "1 cup=160|1 small bowl=120|100 g=100"],
  ["Cooked brown rice", "Rice", 123, 2.7, 25.6, 1.0, 1.8, "1 cup=160|100 g=100"],
  ["Curd rice", "Rice", 132, 3.6, 19.8, 4.0, 0.6, "1 cup=200|100 g=100"],
  ["Lemon rice", "Rice", 178, 3.0, 28.0, 5.8, 1.2, "1 cup=180|100 g=100"],
  ["Tamarind rice (puliyodarai)", "Rice", 192, 3.2, 30.0, 6.4, 1.6, "1 cup=180|100 g=100"],
  ["Coconut rice", "Rice", 205, 3.1, 28.0, 8.6, 2.0, "1 cup=180|100 g=100"],
  ["Sambar rice", "Rice", 128, 4.2, 20.0, 3.2, 2.0, "1 cup=200|100 g=100"],
  ["Chicken biryani", "Rice", 168, 8.5, 18.0, 6.8, 1.0, "1 plate=350|1 small plate=250|100 g=100"],
  ["Mutton biryani", "Rice", 190, 9.0, 17.5, 9.2, 1.0, "1 plate=350|100 g=100"],
  ["Egg biryani", "Rice", 158, 6.2, 20.0, 5.8, 1.0, "1 plate=300|100 g=100"],
  ["Vegetable biryani", "Rice", 142, 3.5, 21.5, 4.8, 1.8, "1 plate=300|100 g=100"],
  ["Fried rice", "Rice", 163, 4.0, 24.0, 5.4, 1.2, "1 plate=250|100 g=100"],
  ["Ghee rice", "Rice", 195, 3.2, 27.0, 8.2, 0.8, "1 cup=180|100 g=100"],

  // ---- Gravies, curries, dals ----
  ["Sambar", "Curry", 62, 3.0, 8.2, 2.0, 2.4, "1 ladle=80|1 bowl=150|100 g=100"],
  ["Rasam", "Curry", 32, 1.2, 4.6, 0.9, 0.8, "1 bowl=150|100 g=100"],
  ["Dal tadka", "Curry", 128, 6.2, 16.0, 4.4, 4.0, "1 bowl=150|100 g=100"],
  ["Toor dal, cooked plain", "Curry", 116, 6.8, 20.0, 0.4, 4.5, "1 bowl=150|100 g=100"],
  ["Chicken curry", "Curry", 152, 12.5, 5.0, 9.2, 1.0, "1 piece with gravy=90|1 bowl=180|100 g=100"],
  ["Chicken 65", "Non-veg", 238, 18.0, 10.0, 14.0, 0.6, "1 plate=150|100 g=100"],
  ["Pepper chicken, dry", "Non-veg", 196, 22.0, 4.0, 10.5, 0.8, "1 plate=150|100 g=100"],
  ["Mutton curry", "Curry", 222, 17.0, 4.5, 15.2, 0.8, "1 bowl=180|100 g=100"],
  ["Fish curry", "Curry", 118, 14.0, 4.0, 5.2, 0.6, "1 piece with gravy=100|100 g=100"],
  ["Fish fry", "Non-veg", 205, 20.0, 7.5, 10.5, 0.3, "1 piece=80|100 g=100"],
  ["Egg curry", "Curry", 148, 8.4, 5.6, 10.2, 0.9, "1 egg with gravy=110|100 g=100"],
  ["Paneer butter masala", "Curry", 232, 8.6, 9.0, 18.0, 1.4, "1 bowl=150|100 g=100"],
  ["Channa masala", "Curry", 158, 7.0, 20.0, 5.8, 6.0, "1 bowl=150|100 g=100"],
  ["Rajma curry", "Curry", 142, 6.6, 18.4, 4.6, 6.2, "1 bowl=150|100 g=100"],
  ["Vegetable kurma", "Curry", 122, 3.2, 12.0, 7.0, 2.6, "1 bowl=150|100 g=100"],
  ["Aviyal", "Curry", 112, 2.6, 9.0, 7.4, 3.0, "1 bowl=120|100 g=100"],
  ["Beans poriyal", "Curry", 92, 2.8, 9.5, 4.8, 3.6, "1 serving=100|100 g=100"],
  ["Cabbage poriyal", "Curry", 78, 2.0, 8.0, 4.4, 2.8, "1 serving=100|100 g=100"],
  ["Coconut chutney", "Condiment", 178, 2.6, 6.0, 16.0, 3.4, "1 tbsp=20|1 serving=50"],
  ["Tomato chutney", "Condiment", 92, 1.6, 8.0, 6.0, 1.6, "1 tbsp=20|1 serving=50"],
  ["Idli podi with oil", "Condiment", 465, 16.0, 36.0, 28.0, 9.0, "1 tsp=6|1 tbsp=15"],

  // ---- Protein ----
  ["Egg, whole boiled", "Protein", 143, 12.6, 0.8, 9.5, 0, "1 egg=50|2 eggs=100|3 eggs=150"],
  ["Egg white", "Protein", 52, 10.9, 0.7, 0.2, 0, "1 white=33|3 whites=100"],
  ["Omelette (2 eggs, oil)", "Protein", 196, 12.0, 1.4, 16.0, 0, "1 omelette=120|100 g=100"],
  ["Chicken breast, cooked", "Protein", 165, 31.0, 0, 3.6, 0, "100 g=100|1 fillet=150"],
  ["Chicken leg, cooked", "Protein", 195, 26.0, 0, 10.0, 0, "1 leg=110|100 g=100"],
  ["Chicken, raw with skin", "Protein", 215, 18.6, 0, 15.0, 0, "100 g=100"],
  ["Mutton, cooked", "Protein", 258, 25.0, 0, 17.5, 0, "100 g=100"],
  ["Fish, seer (raw)", "Protein", 105, 21.5, 0, 2.0, 0, "100 g=100|1 piece=80"],
  ["Prawns, cooked", "Protein", 99, 20.9, 0.2, 1.4, 0, "100 g=100"],
  ["Paneer", "Protein", 296, 18.3, 3.4, 23.0, 0, "100 g=100|1 cube=15"],
  ["Soya chunks, dry", "Protein", 345, 52.0, 33.0, 0.5, 13.0, "1 cup dry=60|100 g=100"],
  ["Curd (dahi)", "Dairy", 62, 3.1, 4.7, 3.3, 0, "1 cup=200|1 bowl=150|100 g=100", "g", 4.7],
  ["Greek yoghurt, plain", "Dairy", 59, 10.0, 3.6, 0.4, 0, "1 cup=170|100 g=100", "g", 3.6],
  ["Whey protein powder", "Protein", 400, 80.0, 10.0, 5.0, 0, "1 scoop=30|100 g=100"],
  ["Sprouted moong", "Protein", 148, 10.4, 22.0, 0.8, 7.6, "1 cup=100|100 g=100"],
  ["Sundal (channa)", "Snacks", 154, 7.2, 20.0, 4.8, 6.0, "1 cup=100|100 g=100"],

  // ---- Snacks ----
  ["Samosa", "Snacks", 262, 4.5, 30.0, 13.5, 2.4, "1 samosa=60|100 g=100"],
  ["Onion bajji", "Snacks", 275, 5.5, 30.0, 15.0, 3.0, "1 bajji=40|3 bajji=120"],
  ["Bonda", "Snacks", 305, 5.0, 34.0, 17.0, 2.6, "1 bonda=45|100 g=100"],
  ["Mixture", "Snacks", 520, 12.0, 50.0, 30.0, 6.0, "1 handful=30|100 g=100"],
  ["Murukku", "Snacks", 512, 9.0, 52.0, 29.0, 4.0, "1 murukku=20|100 g=100"],
  ["Marie biscuit", "Snacks", 440, 7.0, 78.0, 11.5, 2.0, "1 biscuit=5|4 biscuits=20", "g", 22],
  ["Potato chips", "Snacks", 536, 6.6, 53.0, 34.0, 4.4, "1 small pack=30|100 g=100"],
  ["Banana chips", "Snacks", 519, 2.3, 58.0, 33.6, 3.7, "1 handful=30|100 g=100"],
  ["Roasted groundnuts", "Snacks", 567, 25.8, 16.1, 49.2, 8.5, "1 handful=30|100 g=100"],
  ["Almonds", "Snacks", 579, 21.2, 21.6, 49.9, 12.5, "10 almonds=12|1 handful=30"],
  ["Vada pav", "Snacks", 286, 6.0, 38.0, 12.0, 2.6, "1 piece=140"],
  ["Gulab jamun", "Sweets", 336, 4.4, 48.0, 14.0, 0.4, "1 piece=45|2 pieces=90", "g", 38],
  ["Mysore pak", "Sweets", 545, 5.0, 55.0, 34.0, 0.6, "1 piece=35|100 g=100", "g", 45],
  ["Dark chocolate 70%", "Sweets", 598, 7.8, 45.9, 42.6, 10.9, "1 square=10|1 bar=50", "g", 24],

  // ---- Fruit and vegetables ----
  ["Banana", "Fruit", 89, 1.1, 22.8, 0.3, 2.6, "1 medium=118|1 small=90", "g", 12.2],
  ["Apple", "Fruit", 52, 0.3, 13.8, 0.2, 2.4, "1 medium=180", "g", 10.4],
  ["Mango", "Fruit", 60, 0.8, 15.0, 0.4, 1.6, "1 medium=200", "g", 13.7],
  ["Papaya", "Fruit", 43, 0.5, 10.8, 0.3, 1.7, "1 cup=140", "g", 7.8],
  ["Orange", "Fruit", 47, 0.9, 11.8, 0.1, 2.4, "1 medium=130", "g", 9.4],
  ["Guava", "Fruit", 68, 2.6, 14.3, 1.0, 5.4, "1 medium=110", "g", 8.9],
  ["Spinach (palak), raw", "Vegetables", 23, 2.9, 3.6, 0.4, 2.2, "1 cup=30|100 g=100"],
  ["Carrot, raw", "Vegetables", 41, 0.9, 9.6, 0.2, 2.8, "1 medium=60|100 g=100"],
  ["Tomato", "Vegetables", 18, 0.9, 3.9, 0.2, 1.2, "1 medium=100"],
  ["Onion", "Vegetables", 40, 1.1, 9.3, 0.1, 1.7, "1 medium=110"],
  ["Potato, boiled", "Vegetables", 87, 1.9, 20.1, 0.1, 1.8, "1 medium=150|100 g=100"],
  ["Cucumber", "Vegetables", 15, 0.7, 3.6, 0.1, 0.5, "1 medium=200"],

  // ---- Staples and fats ----
  ["Rice, raw", "Staples", 345, 6.8, 78.0, 0.5, 1.0, "1 cup=180|100 g=100"],
  ["Wheat flour (atta)", "Staples", 341, 12.1, 69.4, 1.7, 11.0, "1 cup=120|100 g=100"],
  ["Oats, dry", "Staples", 389, 16.9, 66.3, 6.9, 10.6, "1 cup=80|1 serving=40"],
  ["Ragi flour", "Staples", 328, 7.3, 72.0, 1.3, 11.5, "1 cup=120|100 g=100"],
  ["Sugar", "Staples", 400, 0, 100, 0, 0, "1 tsp=5|1 tbsp=15", "g", 100],
  ["Cooking oil", "Fats", 884, 0, 0, 100, 0, "1 tsp=5|1 tbsp=14|100 g=100"],
  ["Ghee", "Fats", 900, 0, 0, 100, 0, "1 tsp=5|1 tbsp=14"],
  ["Butter", "Fats", 717, 0.9, 0.1, 81.1, 0, "1 tsp=5|1 tbsp=14"],
  ["Coconut, fresh grated", "Fats", 354, 3.3, 15.2, 33.5, 9.0, "1 tbsp=10|1 cup=80"],

  // ---- Drinks (per 100 ml) ----
  ["Tea with milk and sugar", "Drinks", 43, 1.1, 6.0, 1.5, 0, "1 cup=150|1 tumbler=100", "ml", 5.5],
  ["Coffee with milk and sugar", "Drinks", 53, 1.3, 6.7, 2.0, 0, "1 cup=150|1 tumbler=100", "ml", 6.2],
  ["Black coffee, no sugar", "Drinks", 2, 0.2, 0, 0, 0, "1 cup=150", "ml", 0],
  ["Milk, full fat", "Drinks", 62, 3.2, 4.8, 3.3, 0, "1 cup=200|100 ml=100", "ml", 4.8],
  ["Milk, toned", "Drinks", 47, 3.1, 4.7, 1.7, 0, "1 cup=200|100 ml=100", "ml", 4.7],
  ["Horlicks with milk", "Drinks", 95, 3.6, 13.5, 2.8, 0, "1 cup=200", "ml", 11],
  ["Boost with milk", "Drinks", 98, 3.5, 14.0, 2.9, 0, "1 cup=200", "ml", 11.5],
  ["Buttermilk (neer mor)", "Drinks", 20, 1.6, 2.4, 0.5, 0, "1 glass=200", "ml", 2.4],
  ["Tender coconut water", "Drinks", 19, 0.7, 3.7, 0.2, 1.1, "1 coconut=250", "ml", 2.6],
  ["Fresh orange juice", "Drinks", 45, 0.7, 10.4, 0.2, 0.2, "1 glass=200", "ml", 8.4],
  ["Cola soft drink", "Drinks", 42, 0, 10.6, 0, 0, "1 can=330|1 glass=200", "ml", 10.6],
  ["Filter coffee decoction with milk", "Drinks", 60, 1.6, 7.5, 2.4, 0, "1 tumbler=120", "ml", 6.5],
  ["Water", "Drinks", 0, 0, 0, 0, 0, "1 glass=250|1 bottle=1000", "ml", 0],
];

/** Micronutrients are only filled in where a trustworthy source exists. */
const MICRO_TABLE: Record<string, Micros> = {
  "egg-whole-boiled": {
    vitA_ug: 149, vitB2_mg: 0.51, vitB12_ug: 1.1, vitD_ug: 2.0, vitE_mg: 1.05,
    calcium_mg: 50, iron_mg: 1.2, magnesium_mg: 10, potassium_mg: 126, zinc_mg: 1.1, phosphorus_mg: 172,
  },
  "chicken-breast-cooked": {
    vitB3_mg: 13.7, vitB6_mg: 0.6, vitB12_ug: 0.3,
    iron_mg: 1.0, magnesium_mg: 29, potassium_mg: 256, zinc_mg: 1.0, phosphorus_mg: 210,
  },
  "milk-full-fat": {
    vitA_ug: 46, vitB2_mg: 0.18, vitB12_ug: 0.45, vitD_ug: 0.1,
    calcium_mg: 113, magnesium_mg: 10, potassium_mg: 143, zinc_mg: 0.4, phosphorus_mg: 84,
  },
  "spinach-palak-raw": {
    vitA_ug: 469, vitC_mg: 28, vitK_ug: 483, vitB6_mg: 0.19,
    calcium_mg: 99, iron_mg: 2.7, magnesium_mg: 79, potassium_mg: 558, zinc_mg: 0.53,
  },
  banana: {
    vitB6_mg: 0.37, vitC_mg: 8.7,
    calcium_mg: 5, iron_mg: 0.26, magnesium_mg: 27, potassium_mg: 358, zinc_mg: 0.15, phosphorus_mg: 22,
  },
  "cooked-white-rice": {
    vitB1_mg: 0.02, vitB3_mg: 0.4,
    calcium_mg: 10, iron_mg: 0.2, magnesium_mg: 12, potassium_mg: 35, zinc_mg: 0.49, phosphorus_mg: 43,
  },
  "toor-dal-cooked-plain": {
    vitB1_mg: 0.15, vitB6_mg: 0.05,
    calcium_mg: 27, iron_mg: 1.4, magnesium_mg: 46, potassium_mg: 384, zinc_mg: 1.1, phosphorus_mg: 119,
  },
  paneer: {
    vitA_ug: 180, vitB2_mg: 0.2, vitB12_ug: 0.9, vitD_ug: 0.3,
    calcium_mg: 480, iron_mg: 0.2, magnesium_mg: 28, potassium_mg: 138, zinc_mg: 1.4, phosphorus_mg: 320,
  },
  "roasted-groundnuts": {
    vitB3_mg: 12.1, vitB6_mg: 0.35, vitE_mg: 8.3,
    calcium_mg: 92, iron_mg: 4.6, magnesium_mg: 168, potassium_mg: 705, zinc_mg: 3.3, phosphorus_mg: 376,
  },
  guava: {
    vitA_ug: 31, vitC_mg: 228, vitB6_mg: 0.11,
    calcium_mg: 18, iron_mg: 0.26, magnesium_mg: 22, potassium_mg: 417,
  },
};

function parsePortions(spec: string): Portion[] {
  return spec.split("|").map((part) => {
    const [label, amount] = part.split("=");
    return { label: label.trim(), amount: Number(amount) };
  });
}

function toFood(seed: Seed): Food {
  const [name, category, kcal, protein, carbs, fat, fiber, portions, unit = "g", sugar, sodium] = seed;
  const id = slug(name);
  const per100: Macros = { kcal, protein, carbs, fat };
  if (fiber !== null && fiber !== undefined) per100.fiber = fiber;
  if (sugar !== null && sugar !== undefined) per100.sugar = sugar;
  if (sodium !== null && sodium !== undefined) per100.sodium = sodium;
  return {
    id,
    name,
    category,
    unit,
    per100,
    micros: MICRO_TABLE[id],
    portions: parsePortions(portions),
    defaultPortionIndex: 0,
    source: "database",
  };
}

export const SEED_FOODS: Food[] = SEEDS.map(toFood);

export const FOOD_CATEGORIES = Array.from(new Set(SEED_FOODS.map((f) => f.category))).sort();
