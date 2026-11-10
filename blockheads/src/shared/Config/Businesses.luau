-- Business tiers, in unlock order. A player's BusinessTier is an index into this list.
-- To add a new business later: append an entry here and add its products in Products.luau.

export type Business = {
	Id: string,
	Name: string,
	Emoji: string,
	UnlockCost: number,
	Wall: Color3,
	Accent: Color3,
	Description: string,
}

local Businesses: { Business } = {
	{
		Id = "Lemonade",
		Name = "Lemonade Stand",
		Emoji = "🍋",
		UnlockCost = 0,
		Wall = Color3.fromRGB(255, 244, 204),
		Accent = Color3.fromRGB(255, 205, 56),
		Description = "Where every empire starts.",
	},
	{
		Id = "Burger",
		Name = "Burger Shop",
		Emoji = "🍔",
		UnlockCost = 7500,
		Wall = Color3.fromRGB(255, 226, 196),
		Accent = Color3.fromRGB(226, 88, 62),
		Description = "Sizzling burgers. Bigger orders, bigger coins.",
	},
	{
		Id = "Pizza",
		Name = "Pizza Shop",
		Emoji = "🍕",
		UnlockCost = 60000,
		Wall = Color3.fromRGB(255, 240, 220),
		Accent = Color3.fromRGB(64, 160, 92),
		Description = "Hot slices for hungry Blockheads.",
	},
	{
		Id = "IceCream",
		Name = "Ice Cream Shop",
		Emoji = "🍦",
		UnlockCost = 500000,
		Wall = Color3.fromRGB(232, 246, 255),
		Accent = Color3.fromRGB(255, 130, 190),
		Description = "The coolest shop on Business Street.",
	},
	{
		Id = "Restaurant",
		Name = "Restaurant",
		Emoji = "🍽️",
		UnlockCost = 4000000,
		Wall = Color3.fromRGB(245, 236, 255),
		Accent = Color3.fromRGB(122, 84, 214),
		Description = "Fine dining. The top of the food chain.",
	},
}

return Businesses
