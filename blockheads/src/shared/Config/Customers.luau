-- Customer personalities.
--   Weight     = relative spawn chance
--   Patience   = seconds they wait at the front of the queue experience (whole wait)
--   PayMult    = multiplier on the order price
--   Items      = how many products they order
--   Xp         = player XP for serving them
--   RushPoints = Customer Rush points for serving them
--   Special    = boosted by the Curb Appeal upgrade

export type CustomerType = {
	Id: string,
	Name: string,
	Emoji: string,
	Weight: number,
	Patience: number,
	PayMult: number,
	Items: number,
	Xp: number,
	RushPoints: number,
	Special: boolean,
	Shirt: Color3?,
	Hat: string?,
}

local list: { CustomerType } = {
	{
		Id = "Normal",
		Name = "Customer",
		Emoji = "🙂",
		Weight = 60,
		Patience = 24,
		PayMult = 1,
		Items = 1,
		Xp = 3,
		RushPoints = 10,
		Special = false,
	},
	{
		Id = "Impatient",
		Name = "Impatient Customer",
		Emoji = "⏰",
		Weight = 14,
		Patience = 11,
		PayMult = 1.4,
		Items = 1,
		Xp = 4,
		RushPoints = 15,
		Special = false,
		Shirt = Color3.fromRGB(230, 80, 70),
	},
	{
		Id = "Hungry",
		Name = "Hungry Customer",
		Emoji = "😋",
		Weight = 12,
		Patience = 26,
		PayMult = 1.1,
		Items = 2,
		Xp = 6,
		RushPoints = 20,
		Special = false,
		Shirt = Color3.fromRGB(255, 150, 60),
	},
	{
		Id = "Rich",
		Name = "Rich Customer",
		Emoji = "🤑",
		Weight = 8,
		Patience = 20,
		PayMult = 2.5,
		Items = 1,
		Xp = 8,
		RushPoints = 25,
		Special = true,
		Shirt = Color3.fromRGB(40, 140, 90),
		Hat = "TopHat",
	},
	{
		Id = "VIP",
		Name = "VIP Customer",
		Emoji = "🌟",
		Weight = 3,
		Patience = 15,
		PayMult = 5,
		Items = 1,
		Xp = 15,
		RushPoints = 50,
		Special = true,
		Shirt = Color3.fromRGB(255, 210, 60),
		Hat = "Crown",
	},
	{
		-- A Blockheads character visiting your shop. Serving them builds friendship
		-- (see Characters.luau, Unlock.Kind = "Befriend").
		Id = "Character",
		Name = "Blockhead Visitor",
		Emoji = "💛",
		Weight = 2,
		Patience = 22,
		PayMult = 3,
		Items = 1,
		Xp = 12,
		RushPoints = 40,
		Special = true,
	},
}

local byId: { [string]: CustomerType } = {}
for _, customerType in list do
	byId[customerType.Id] = customerType
end

return {
	List = list,
	ById = byId,
}
