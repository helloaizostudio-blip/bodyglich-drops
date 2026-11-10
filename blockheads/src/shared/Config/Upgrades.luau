-- Business upgrades. Cost of the next level = BaseCost * Growth ^ currentLevel.
-- The effect of each level is applied in Shared/Modules/Formulas.luau.

export type Upgrade = {
	Id: string,
	Name: string,
	Emoji: string,
	Description: string,
	MaxLevel: number,
	BaseCost: number,
	Growth: number,
	PerLevel: number,
}

local list: { Upgrade } = {
	{
		Id = "Speed",
		Name = "Faster Hands",
		Emoji = "⚡",
		Description = "Make products 6% faster per level.",
		MaxLevel = 10,
		BaseCost = 25,
		Growth = 2.2,
		PerLevel = 0.06,
	},
	{
		Id = "Quality",
		Name = "Premium Recipes",
		Emoji = "✨",
		Description = "Everything sells for 10% more per level.",
		MaxLevel = 10,
		BaseCost = 60,
		Growth = 2.4,
		PerLevel = 0.10,
	},
	{
		Id = "Capacity",
		Name = "Bigger Queue",
		Emoji = "👥",
		Description = "+1 queue spot and customers arrive 7% faster per level.",
		MaxLevel = 6,
		BaseCost = 120,
		Growth = 2.8,
		PerLevel = 0.07,
	},
	{
		Id = "Staff",
		Name = "Hire Staff",
		Emoji = "🧑‍🍳",
		Description = "Your team serves customers for you. Sales go to the register.",
		MaxLevel = 8,
		BaseCost = 400,
		Growth = 2.6,
		PerLevel = 0.25,
	},
	{
		Id = "Storage",
		Name = "Cash Register",
		Emoji = "💰",
		Description = "The register holds 2.5x more staff sales per level.",
		MaxLevel = 8,
		BaseCost = 300,
		Growth = 2.5,
		PerLevel = 2.5,
	},
	{
		Id = "Appearance",
		Name = "Curb Appeal",
		Emoji = "🌷",
		Description = "Decorate your shop. Attracts more Rich and VIP customers.",
		MaxLevel = 5,
		BaseCost = 250,
		Growth = 3.2,
		PerLevel = 0.25,
	},
}

local byId: { [string]: Upgrade } = {}
for _, upgrade in list do
	byId[upgrade.Id] = upgrade
end

return {
	List = list,
	ById = byId,
	-- Staff serve time = product time * (StaffSlowest - PerLevel * level)
	StaffSlowest = 3.25,
}
