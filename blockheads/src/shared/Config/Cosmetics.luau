-- Shop awning styles. Purely visual.
--   Unlock.Kind = "Default" | "Coins" | "RushWin" | "Stat"

export type Cosmetic = {
	Id: string,
	Name: string,
	Color: Color3,
	Stripe: Color3,
	Neon: boolean?,
	Unlock: { Kind: string, Amount: number?, Stat: string? },
}

local list: { Cosmetic } = {
	{ Id = "Sunny", Name = "Sunny Yellow", Color = Color3.fromRGB(255, 205, 56), Stripe = Color3.fromRGB(255, 255, 255), Unlock = { Kind = "Default" } },
	{ Id = "Berry", Name = "Berry Red", Color = Color3.fromRGB(232, 72, 85), Stripe = Color3.fromRGB(255, 255, 255), Unlock = { Kind = "Coins", Amount = 500 } },
	{ Id = "Ocean", Name = "Ocean Blue", Color = Color3.fromRGB(58, 134, 255), Stripe = Color3.fromRGB(255, 255, 255), Unlock = { Kind = "Coins", Amount = 500 } },
	{ Id = "Mint", Name = "Fresh Mint", Color = Color3.fromRGB(80, 210, 160), Stripe = Color3.fromRGB(240, 255, 250), Unlock = { Kind = "Coins", Amount = 2500 } },
	{ Id = "Grape", Name = "Grape Soda", Color = Color3.fromRGB(150, 90, 230), Stripe = Color3.fromRGB(240, 225, 255), Unlock = { Kind = "Coins", Amount = 12000 } },
	{ Id = "Midnight", Name = "Midnight", Color = Color3.fromRGB(36, 40, 66), Stripe = Color3.fromRGB(255, 205, 56), Unlock = { Kind = "Coins", Amount = 60000 } },
	{ Id = "Neon", Name = "Neon Rush", Color = Color3.fromRGB(60, 255, 200), Stripe = Color3.fromRGB(255, 70, 200), Neon = true, Unlock = { Kind = "Stat", Stat = "RushPoints", Amount = 5000 } },
	{ Id = "Gold", Name = "Rush Champion Gold", Color = Color3.fromRGB(255, 200, 40), Stripe = Color3.fromRGB(255, 240, 170), Neon = true, Unlock = { Kind = "RushWin" } },
}

local byId: { [string]: Cosmetic } = {}
for _, cosmetic in list do
	byId[cosmetic.Id] = cosmetic
end

return {
	List = list,
	ById = byId,
	Default = "Sunny",
}
