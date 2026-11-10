-- BLOCKHEADS: HUSTLE & COLLECT - client entry point.
-- Starts the controllers, then builds the UI panels. All client code is cosmetic or
-- input: every decision that matters is made by the server.

local Controllers = script.Parent:WaitForChild("Controllers")
local UI = script.Parent:WaitForChild("UI")

local State = require(Controllers.State)
local Hud = require(Controllers.Hud)
local CustomerRenderer = require(Controllers.CustomerRenderer)
local Effects = require(Controllers.Effects)
local World = require(Controllers.World)

local InfoPanels = require(UI.InfoPanels)

State.Start()
Hud.Start()

Hud.registerPanel("Shop", require(UI.ShopPanel).create(Hud))
Hud.registerPanel("Upgrades", require(UI.UpgradesPanel).create(Hud))
Hud.registerPanel("Characters", require(UI.CharactersPanel).create(Hud))
Hud.registerPanel("Quests", InfoPanels.createQuests(Hud))
Hud.registerPanel("Daily", InfoPanels.createDaily(Hud))
Hud.registerPanel("Rush", InfoPanels.createRush(Hud))
Hud.registerPanel("Settings", InfoPanels.createSettings(Hud))

CustomerRenderer.Start()
Effects.Start()
World.Start()
