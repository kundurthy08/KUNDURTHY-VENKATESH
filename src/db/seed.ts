import { sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  branches,
  menuCategories,
  menuItems,
  offers,
  siteContent,
  type ModifierGroup,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureInitialSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existingBranches = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(branches);

  if ((existingBranches[0]?.count ?? 0) === 0) {
    await db
      .insert(branches)
      .values({
        slug: 'charminar-flagship',
        name: 'Charminar Café — Flagship Heritage Lounge',
        addressLine: 'Placeholder Address — Update Verified Street & Landmark in Admin Portal',
        city: 'Hyderabad, Telangana',
        phone: '+91 40 0000 0000 (Placeholder)',
        email: 'hello@charminarcafe.example',
        openingHours: '07:30 AM – 11:00 PM Daily (Placeholder — Verify with Owner)',
        mapUrl: 'https://maps.google.com/?q=Charminar+Hyderabad',
        totalSeats: 40,
        slotDurationMinutes: 90,
        isVerified: false,
        active: true,
      })
      .onConflictDoNothing();
  }

  const existingCategories = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(menuCategories);

  if ((existingCategories[0]?.count ?? 0) === 0) {
    const insertedCategories = await db
      .insert(menuCategories)
      .values([
        {
          slug: 'irani-chai',
          name: 'Irani Chai & Teas',
          description: 'Slow-brewed Hyderabadi chai blends and spiced infusions (Draft Preview)',
          sortOrder: 1,
          active: true,
        },
        {
          slug: 'deccan-coffee',
          name: 'Deccan Coffee',
          description: 'Single-estate South Indian filter roasts and contemporary espresso',
          sortOrder: 2,
          active: true,
        },
        {
          slug: 'bun-maska-bakery',
          name: 'Bun Maska & Bakery',
          description: 'Warm artisanal milk buns, whipped cultured butter, and Osmania bakes',
          sortOrder: 3,
          active: true,
        },
        {
          slug: 'hyderabadi-snacks',
          name: 'Hyderabadi Snacks',
          description: 'Spiced sourdough toasties, savory tartlets, and café plates',
          sortOrder: 4,
          active: true,
        },
        {
          slug: 'desserts',
          name: 'Sweets & Desserts',
          description: 'Saffron, pistachio, and cardamom heritage desserts',
          sortOrder: 5,
          active: true,
        },
      ])
      .onConflictDoNothing()
      .returning();

    const catBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));
    const sugarMod: ModifierGroup = {
      id: 'sweetness',
      name: 'Sweetness Level',
      required: false,
      maxSelect: 1,
      options: [
        { id: 'classic', label: 'Classic Balanced', priceDeltaPaise: 0 },
        { id: 'less-sugar', label: 'Less Sugar', priceDeltaPaise: 0 },
        { id: 'jaggery', label: 'Organic Jaggery Swap', priceDeltaPaise: 2000 },
      ],
    };
    const sizeMod: ModifierGroup = {
      id: 'portion',
      name: 'Pour Size',
      required: false,
      maxSelect: 1,
      options: [
        { id: 'regular', label: 'Regular Cup', priceDeltaPaise: 0 },
        { id: 'kulhad-large', label: 'Double Samovar Pour', priceDeltaPaise: 4500 },
      ],
    };

    const chaiCat = catBySlug.get('irani-chai');
    const coffeeCat = catBySlug.get('deccan-coffee');
    const bakeryCat = catBySlug.get('bun-maska-bakery');
    const snackCat = catBySlug.get('hyderabadi-snacks');
    const dessertCat = catBySlug.get('desserts');

    if (chaiCat && coffeeCat && bakeryCat && snackCat && dessertCat) {
      await db
        .insert(menuItems)
        .values([
          {
            categoryId: chaiCat,
            slug: 'signature-irani-chai',
            name: 'Heritage Irani Chai & Osmania Pairing',
            description:
              'Slow-simmered Assam decoction folded into velvety reduced mawa milk, served in porcelain with two warm Osmania biscuits.',
            basePricePaise: 14000,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_irani_chai_1795358468520.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains dairy and wheat gluten (biscuits).',
            isSignature: true,
            isDraftSample: true,
            available: true,
            modifiersJson: [sizeMod, sugarMod],
          },
          {
            categoryId: chaiCat,
            slug: 'zafrani-elaichi-chai',
            name: 'Zafrani Cardamom Samovar Chai',
            description:
              'Fragrant green cardamom pods and Kashmiri saffron strands steeped in our signature slow-boiled milk tea.',
            basePricePaise: 17500,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_irani_chai_1795358468520.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains dairy.',
            isSignature: false,
            isDraftSample: true,
            available: true,
            modifiersJson: [sizeMod, sugarMod],
          },
          {
            categoryId: bakeryCat,
            slug: 'whipped-bun-maska',
            name: 'Warm Brioche Bun Maska',
            description:
              'Pillow-soft toasted sweet milk bun split and layered generously with house-whipped salted butter and raw sugar crystals.',
            basePricePaise: 12000,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_bun_maska_1795358468592.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains dairy and wheat gluten.',
            isSignature: true,
            isDraftSample: true,
            available: true,
            modifiersJson: [
              {
                id: 'extras',
                name: 'Artisanal Spreads',
                required: false,
                maxSelect: 2,
                options: [
                  { id: 'extra-maska', label: 'Extra Cultured Butter', priceDeltaPaise: 3000 },
                  { id: 'rose-jam', label: 'House Rose Petal Preserve', priceDeltaPaise: 4000 },
                ],
              },
            ],
          },
          {
            categoryId: coffeeCat,
            slug: 'deccan-brass-filter-kaapi',
            name: 'Deccan Brass Filter Kaapi',
            description:
              'Chikmagalur dark-roast chicory blend slow-dripped in traditional brass, pulled high for a natural golden micro-foam.',
            basePricePaise: 16000,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_deccan_coffee_1795358468183.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains dairy (oat milk option available).',
            isSignature: true,
            isDraftSample: true,
            available: true,
            modifiersJson: [
              sugarMod,
              {
                id: 'milk',
                name: 'Milk Choice',
                required: false,
                maxSelect: 1,
                options: [
                  { id: 'farm-milk', label: 'Full Cream Farm Milk', priceDeltaPaise: 0 },
                  { id: 'oat-milk', label: 'Barista Oat Milk', priceDeltaPaise: 4500 },
                ],
              },
            ],
          },
          {
            categoryId: snackCat,
            slug: 'hyderabadi-masala-toastie',
            name: 'Deccani Spiced Sourdough Toastie & Samosa Tartlets',
            description:
              'Char-grilled sourdough layered with roasted spices, melted aged cheddar, crisp pastry tartlets, and fresh mint-coriander chutney.',
            basePricePaise: 28000,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_hyderabadi_snack_1795358468472.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains gluten and dairy.',
            isSignature: true,
            isDraftSample: true,
            available: true,
            modifiersJson: [
              {
                id: 'spice',
                name: 'Spice & Chutney',
                required: false,
                maxSelect: 1,
                options: [
                  { id: 'medium', label: 'Balanced Deccan Spice', priceDeltaPaise: 0 },
                  { id: 'extra-chutney', label: 'Extra Mint Chutney Side', priceDeltaPaise: 2500 },
                ],
              },
            ],
          },
          {
            categoryId: dessertCat,
            slug: 'royal-double-ka-meetha',
            name: 'Warm Saffron Double Ka Meetha',
            description:
              'Ghee-toasted artisanal brioche steeped in saffron cardamom rabri, finished with roasted pistachios and damask rose petals.',
            basePricePaise: 24000,
            taxRateBps: 500,
            imageUrl: '/src/assets/images/menu_saffron_dessert_1795358468508.jpg',
            dietaryTag: 'Vegetarian',
            allergenNote: 'Contains dairy, gluten, and tree nuts (pistachios, almonds).',
            isSignature: false,
            isDraftSample: true,
            available: true,
            modifiersJson: [
              {
                id: 'garnish',
                name: 'Dessert Finishing',
                required: false,
                maxSelect: 1,
                options: [
                  { id: 'classic-rabri', label: 'Warm Classic Pour', priceDeltaPaise: 0 },
                  { id: 'vanilla-kulfi', label: 'With Malai Ice Cream Scoop', priceDeltaPaise: 6500 },
                ],
              },
            ],
          },
        ])
        .onConflictDoNothing();
    }
  }

  const existingOffers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers);

  if ((existingOffers[0]?.count ?? 0) === 0) {
    await db
      .insert(offers)
      .values({
        code: 'DECCAN10',
        title: 'Heritage Welcome — 10% Off Preview Orders',
        description: 'Sample promotional code valid on orders of ₹250 or more. Editable in Admin.',
        discountType: 'percent',
        discountValue: 10,
        minOrderPaise: 25000,
        maxUses: 500,
        usedCount: 0,
        active: true,
      })
      .onConflictDoNothing();
  }

  const existingContent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(siteContent);

  if ((existingContent[0]?.count ?? 0) === 0) {
    await db
      .insert(siteContent)
      .values([
        {
          key: 'our_story',
          title: 'Crafted Around Hyderabad’s Living Café Culture',
          body: 'Charminar Café brings together the architectural grace of old Hyderabad—cusped arches, carved jaali screens, and hammered brass—with unhurried contemporary hospitality. Replace this draft brand narrative with the owner’s verified history inside the Admin Portal.',
          isVerified: false,
          updatedBy: 'system-seed',
        },
        {
          key: 'cafe_atmosphere',
          title: 'Architecture, Warmth & Ritual',
          body: 'Every detail—from deep heritage green plaster and warm teak tables to the aroma of slow-simmered chai—is designed as a calm sanctuary for conversation, work, and evening gatherings.',
          isVerified: false,
          updatedBy: 'system-seed',
        },
        {
          key: 'policy_terms',
          title: 'Terms & Conditions (Draft Template)',
          body: 'Final terms of service, GST invoicing details, and payment terms must be reviewed and verified by the Charminar Café owner before live commercial launch.',
          isVerified: false,
          updatedBy: 'system-seed',
        },
        {
          key: 'policy_privacy',
          title: 'Privacy & Data Protection Notice (Draft Template)',
          body: 'We collect only the contact details needed to fulfil your order or table reservation. Payment credentials are never stored by Charminar Café.',
          isVerified: false,
          updatedBy: 'system-seed',
        },
        {
          key: 'policy_refund',
          title: 'Cancellation & Refund Policy (Draft Template)',
          body: 'Orders may be cancelled prior to kitchen preparation. Reservation modifications are subject to branch slot policies once verified by management.',
          isVerified: false,
          updatedBy: 'system-seed',
        },
      ])
      .onConflictDoNothing();
  }
}
