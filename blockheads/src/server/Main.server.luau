-- BLOCKHEADS: HUSTLE & COLLECT - server entry point.
-- Loads every service in dependency order: Init() first (create objects), then
-- Start() (connect events, begin loops). All gameplay lives in Services/*.

local Services = script.Parent:WaitForChild("Services")

local ORDER = {
	"Remotes",
	"DataService",
	"EconomyService",
	"PlotService",
	"BusinessService",
	"CustomerService",
	"RushService",
	"CharacterService",
	"QuestService",
	"LeaderboardService",
}

local loaded = {}
for _, name in ORDER do
	loaded[name] = require(Services:WaitForChild(name))
end
for _, name in ORDER do
	loaded[name].Init()
end
for _, name in ORDER do
	loaded[name].Start()
end

-- Only now start loading player data (see DataService.Begin).
loaded.DataService.Begin()

print("[Blockheads] Server ready.")
