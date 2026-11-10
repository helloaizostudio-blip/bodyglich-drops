-- Every sellable product.
--   Tier        = index into Businesses.luau (which business introduces it)
--   Price       = coins per sale at level 1
--   Time        = seconds to make one at speed level 0
--   Demand      = how often customers order it relative to other products
--   UnlockCost  = coins to add it to the menu (0 = free with the business)

export type Product = {
	Id: string,
	Name: string,
	Emoji: string,
	Tier: number,
	Price: number,
	Time: number,
	Demand: number,
	UnlockCost: number,
	Order: number,
}

local MAX_LEVEL = 10

local list: { Product } = {
	-- Lemonade Stand
	{ Id = "Lemonade", Name = "Lemonade", Emoji = "🍋", Tier = 1, Price = 5, Time = 2.0, Demand = 10, UnlockCost = 0, Order = 0 },
	{ Id = "StrawberryLemonade", Name = "Strawberry Lemonade", Emoji = "🍓", Tier = 1, Price = 9, Time = 2.4, Demand = 8, UnlockCost = 75, Order = 0 },
	{ Id = "OrangeJuice", Name = "Orange Juice", Emoji = "🍊", Tier = 1, Price = 16, Time = 2.8, Demand = 7, UnlockCost = 350, Order = 0 },
	{ Id = "FreshJuice", Name = "Fresh Juice", Emoji = "🥤", Tier = 1, Price = 28, Time = 3.2, Demand = 6, UnlockCost = 1100, Order = 0 },
	{ Id = "BlockheadsSpecial", Name = "Blockheads Special", Emoji = "🧃", Tier = 1, Price = 48, Time = 3.6, Demand = 5, UnlockCost = 3000, Order = 0 },

	-- Burger Shop
	{ Id = "ClassicBurger", Name = "Classic Burger", Emoji = "🍔", Tier = 2, Price = 85, Time = 3.6, Demand = 10, UnlockCost = 0, Order = 0 },
	{ Id = "Fries", Name = "Crispy Fries", Emoji = "🍟", Tier = 2, Price = 120, Time = 3.4, Demand = 8, UnlockCost = 6000, Order = 0 },
	{ Id = "Cheeseburger", Name = "Cheeseburger", Emoji = "🧀", Tier = 2, Price = 180, Time = 4.0, Demand = 7, UnlockCost = 14000, Order = 0 },
	{ Id = "DoubleStack", Name = "Double Stack", Emoji = "🥓", Tier = 2, Price = 280, Time = 4.4, Demand = 5, UnlockCost = 32000, Order = 0 },

	-- Pizza Shop
	{ Id = "CheeseSlice", Name = "Cheese Slice", Emoji = "🍕", Tier = 3, Price = 450, Time = 4.0, Demand = 10, UnlockCost = 0, Order = 0 },
	{ Id = "Pepperoni", Name = "Pepperoni Pizza", Emoji = "🌶️", Tier = 3, Price = 680, Time = 4.2, Demand = 8, UnlockCost = 55000, Order = 0 },
	{ Id = "VeggiePizza", Name = "Veggie Pizza", Emoji = "🫑", Tier = 3, Price = 950, Time = 4.4, Demand = 7, UnlockCost = 120000, Order = 0 },
	{ Id = "SupremePizza", Name = "Blockhead Supreme", Emoji = "👑", Tier = 3, Price = 1400, Time = 4.8, Demand = 5, UnlockCost = 260000, Order = 0 },

	-- Ice Cream Shop
	{ Id = "VanillaCone", Name = "Vanilla Cone", Emoji = "🍦", Tier = 4, Price = 2200, Time = 4.0, Demand = 10, UnlockCost = 0, Order = 0 },
	{ Id = "ChocoScoop", Name = "Choco Scoop", Emoji = "🍫", Tier = 4, Price = 3200, Time = 4.2, Demand = 8, UnlockCost = 450000, Order = 0 },
	{ Id = "Sundae", Name = "Cherry Sundae", Emoji = "🍒", Tier = 4, Price = 4600, Time = 4.6, Demand = 7, UnlockCost = 950000, Order = 0 },
	{ Id = "RainbowTower", Name = "Rainbow Tower", Emoji = "🌈", Tier = 4, Price = 6800, Time = 5.0, Demand = 5, UnlockCost = 2000000, Order = 0 },

	-- Restaurant
	{ Id = "Pasta", Name = "Pasta Bowl", Emoji = "🍝", Tier = 5, Price = 10500, Time = 4.4, Demand = 10, UnlockCost = 0, Order = 0 },
	{ Id = "Sushi", Name = "Sushi Platter", Emoji = "🍣", Tier = 5, Price = 15000, Time = 4.6, Demand = 8, UnlockCost = 3500000, Order = 0 },
	{ Id = "Steak", Name = "Sizzling Steak", Emoji = "🥩", Tier = 5, Price = 22000, Time = 5.0, Demand = 7, UnlockCost = 8000000, Order = 0 },
	{ Id = "ChefsFeast", Name = "Chef's Feast", Emoji = "🍱", Tier = 5, Price = 34000, Time = 5.4, Demand = 5, UnlockCost = 18000000, Order = 0 },
}

local byId: { [string]: Product } = {}
for index, product in list do
	product.Order = index
	byId[product.Id] = product
end

return {
	List = list,
	ById = byId,
	MaxLevel = MAX_LEVEL,
	PricePerLevel = 0.2, -- +20% price per product level
	UpgradeCostFactor = 14, -- level 2 costs Price * this
	UpgradeCostGrowth = 1.6, -- each further level costs this much more
}
