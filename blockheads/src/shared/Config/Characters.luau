-- The collectible Blockheads cast.
--
-- !! PLACEHOLDER CAST !!
-- These ten characters are temporary stand-ins so the collection system works today.
-- To swap in your real Blockheads cast:
--   1. Change Name / Description / Personality / Look below to match your reference sheets.
--   2. (Optional) Put a finished Model in ReplicatedStorage > Assets > Characters whose
--      name equals the character Id. BlockheadBuilder uses that model instead of the
--      blocky placeholder automatically. The model needs a PrimaryPart.
-- Keep the Id values stable once players have saved data - Ids are what gets saved.
--
-- Bonus kinds (all small, none purchasable with Robux):
--   Sales     +% sale price            Speed  -% production time
--   Patience  +% customer patience     Staff  +% staff speed
--   Xp        +% XP                    Rush   +% Customer Rush points
--
-- Unlock kinds:
--   Starter   owned from the start
--   Coins     bought in the Collection for Amount coins
--   Befriend  appears as a visiting customer; serve them Amount times
--   Stat      unlocked when Stats[Stat] reaches Amount
--   Tier      unlocked when the player owns business tier Amount

export type Look = {
	Skin: Color3,
	Shirt: Color3,
	Pants: Color3,
	Eyes: string, -- "Dot" | "Wide" | "Sleepy" | "Star"
	Mouth: string, -- "Smile" | "Grin" | "Flat" | "Open"
	Hat: string?, -- "Cap" | "ChefHat" | "TopHat" | "Crown" | "Beanie" | "Headphones" | "Bow"
	HatColor: Color3?,
	Scale: number?,
}

export type Character = {
	Id: string,
	Name: string,
	Rarity: string,
	Personality: string,
	Description: string,
	Bonus: { [string]: number },
	Unlock: { Kind: string, Amount: number?, Stat: string? },
	Look: Look,
	Order: number,
}

local Rarities = {
	Common = { Order = 1, Color = Color3.fromRGB(170, 178, 189) },
	Uncommon = { Order = 2, Color = Color3.fromRGB(88, 196, 108) },
	Rare = { Order = 3, Color = Color3.fromRGB(70, 150, 255) },
	Epic = { Order = 4, Color = Color3.fromRGB(170, 96, 255) },
	Legendary = { Order = 5, Color = Color3.fromRGB(255, 184, 48) },
}

local list: { Character } = {
	{
		Id = "Brix",
		Name = "Brix",
		Rarity = "Common",
		Personality = "Cheerful and dependable",
		Description = "Your first friend in Blockheads Town. Never misses a shift.",
		Bonus = { Sales = 0.03 },
		Unlock = { Kind = "Starter" },
		Look = {
			Skin = Color3.fromRGB(255, 214, 102),
			Shirt = Color3.fromRGB(64, 156, 255),
			Pants = Color3.fromRGB(52, 73, 110),
			Eyes = "Dot",
			Mouth = "Smile",
			Hat = "Cap",
			HatColor = Color3.fromRGB(64, 156, 255),
		},
		Order = 1,
	},
	{
		Id = "Lemmy",
		Name = "Lemmy",
		Rarity = "Common",
		Personality = "Zesty and always in a hurry",
		Description = "Squeezes lemons faster than anyone on Business Street.",
		Bonus = { Speed = 0.03 },
		Unlock = { Kind = "Coins", Amount = 750 },
		Look = {
			Skin = Color3.fromRGB(255, 236, 110),
			Shirt = Color3.fromRGB(120, 200, 80),
			Pants = Color3.fromRGB(70, 110, 60),
			Eyes = "Wide",
			Mouth = "Grin",
			Hat = "Beanie",
			HatColor = Color3.fromRGB(120, 200, 80),
		},
		Order = 2,
	},
	{
		Id = "Dotty",
		Name = "Dotty",
		Rarity = "Common",
		Personality = "Chatty and kind",
		Description = "Keeps the queue smiling with terrible jokes.",
		Bonus = { Patience = 0.06 },
		Unlock = { Kind = "Befriend", Amount = 3 },
		Look = {
			Skin = Color3.fromRGB(255, 196, 170),
			Shirt = Color3.fromRGB(255, 120, 160),
			Pants = Color3.fromRGB(120, 70, 110),
			Eyes = "Dot",
			Mouth = "Open",
			Hat = "Bow",
			HatColor = Color3.fromRGB(255, 90, 140),
		},
		Order = 3,
	},
	{
		Id = "Chip",
		Name = "Chip",
		Rarity = "Uncommon",
		Personality = "Quiet workaholic",
		Description = "Runs the counter while you take a break.",
		Bonus = { Staff = 0.08 },
		Unlock = { Kind = "Coins", Amount = 6000 },
		Look = {
			Skin = Color3.fromRGB(196, 150, 110),
			Shirt = Color3.fromRGB(245, 245, 245),
			Pants = Color3.fromRGB(60, 60, 70),
			Eyes = "Sleepy",
			Mouth = "Flat",
			Hat = "ChefHat",
			HatColor = Color3.fromRGB(255, 255, 255),
		},
		Order = 4,
	},
	{
		Id = "Maple",
		Name = "Maple",
		Rarity = "Uncommon",
		Personality = "Sweet-talking saleswoman",
		Description = "Could sell lemonade to a lemon.",
		Bonus = { Sales = 0.05 },
		Unlock = { Kind = "Stat", Stat = "Served", Amount = 250 },
		Look = {
			Skin = Color3.fromRGB(236, 170, 120),
			Shirt = Color3.fromRGB(214, 90, 50),
			Pants = Color3.fromRGB(110, 60, 40),
			Eyes = "Wide",
			Mouth = "Smile",
			Hat = "Beanie",
			HatColor = Color3.fromRGB(190, 60, 40),
		},
		Order = 5,
	},
	{
		Id = "Zoom",
		Name = "Zoom",
		Rarity = "Rare",
		Personality = "Hyperactive speedster",
		Description = "Has never once walked anywhere.",
		Bonus = { Speed = 0.07 },
		Unlock = { Kind = "Befriend", Amount = 5 },
		Look = {
			Skin = Color3.fromRGB(150, 220, 255),
			Shirt = Color3.fromRGB(255, 80, 80),
			Pants = Color3.fromRGB(40, 40, 60),
			Eyes = "Star",
			Mouth = "Grin",
			Hat = "Cap",
			HatColor = Color3.fromRGB(255, 80, 80),
		},
		Order = 6,
	},
	{
		Id = "ProfessorCube",
		Name = "Professor Cube",
		Rarity = "Rare",
		Personality = "Absent-minded genius",
		Description = "Studied business for forty years. Still forgets his wallet.",
		Bonus = { Xp = 0.15 },
		Unlock = { Kind = "Coins", Amount = 75000 },
		Look = {
			Skin = Color3.fromRGB(220, 220, 235),
			Shirt = Color3.fromRGB(110, 90, 160),
			Pants = Color3.fromRGB(60, 50, 80),
			Eyes = "Sleepy",
			Mouth = "Flat",
			Hat = "TopHat",
			HatColor = Color3.fromRGB(60, 50, 80),
		},
		Order = 7,
	},
	{
		Id = "DJVoxel",
		Name = "DJ Voxel",
		Rarity = "Epic",
		Personality = "Party starter",
		Description = "Turns every Customer Rush into a festival.",
		Bonus = { Rush = 0.10 },
		Unlock = { Kind = "Stat", Stat = "RushPoints", Amount = 3000 },
		Look = {
			Skin = Color3.fromRGB(180, 130, 255),
			Shirt = Color3.fromRGB(30, 30, 40),
			Pants = Color3.fromRGB(50, 220, 200),
			Eyes = "Star",
			Mouth = "Grin",
			Hat = "Headphones",
			HatColor = Color3.fromRGB(50, 220, 200),
		},
		Order = 8,
	},
	{
		Id = "QueenQuartz",
		Name = "Queen Quartz",
		Rarity = "Epic",
		Personality = "Royally dramatic",
		Description = "Only visits the fanciest shops. Tips accordingly.",
		Bonus = { Sales = 0.07, Patience = 0.05 },
		Unlock = { Kind = "Befriend", Amount = 8 },
		Look = {
			Skin = Color3.fromRGB(255, 200, 230),
			Shirt = Color3.fromRGB(150, 70, 200),
			Pants = Color3.fromRGB(90, 40, 130),
			Eyes = "Wide",
			Mouth = "Smile",
			Hat = "Crown",
			HatColor = Color3.fromRGB(255, 205, 60),
		},
		Order = 9,
	},
	{
		Id = "Goldie",
		Name = "Goldie",
		Rarity = "Legendary",
		Personality = "Living legend",
		Description = "The original Blockhead tycoon. Only joins the very best.",
		Bonus = { Sales = 0.08, Speed = 0.08 },
		Unlock = { Kind = "Tier", Amount = 5 },
		Look = {
			Skin = Color3.fromRGB(255, 200, 50),
			Shirt = Color3.fromRGB(255, 240, 180),
			Pants = Color3.fromRGB(200, 140, 30),
			Eyes = "Star",
			Mouth = "Grin",
			Hat = "Crown",
			HatColor = Color3.fromRGB(255, 255, 255),
			Scale = 1.1,
		},
		Order = 10,
	},
}

local byId: { [string]: Character } = {}
for _, character in list do
	byId[character.Id] = character
end

local BonusLabels = {
	Sales = "Sale Price",
	Speed = "Production Speed",
	Patience = "Customer Patience",
	Staff = "Staff Speed",
	Xp = "XP",
	Rush = "Rush Points",
}

return {
	List = list,
	ById = byId,
	Rarities = Rarities,
	BonusLabels = BonusLabels,
	MaxTeamSize = 3,
}
