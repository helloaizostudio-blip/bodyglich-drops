-- The smaller panels: daily Quests, Daily reward, Rush info and Settings.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Theme = require(Shared.Config.Theme)
local Quests = require(Shared.Config.Quests)
local RushConfig = require(Shared.Config.Rush)
local Format = require(Shared.Modules.Format)
local Formulas = require(Shared.Modules.Formulas)
local Kit = require(script.Parent.Kit)
local State = require(script.Parent.Parent.Controllers.State)

local InfoPanels = {}

local questDefs = {}
for _, def in Quests.Pool do
	questDefs[def.Id] = def
end

---------------------------------------------------------------------------------------
-- Daily quests
---------------------------------------------------------------------------------------

function InfoPanels.createQuests(Hud)
	local content = Hud.newPanel("Quests", "📜 DAILY QUESTS", Vector2.new(620, 400))
	local holder = Kit.frame({ Size = UDim2.new(1, 0, 1, -30), BackgroundTransparency = 1, Parent = content })
	Kit.list(holder, 8)
	Kit.text({
		Size = UDim2.new(1, 0, 0, 24),
		Position = UDim2.new(0, 0, 1, -24),
		Text = "Three new quests every day. Rewards grow with your shop!",
		TextSize = 14,
		Font = Theme.BodyFont,
		TextColor3 = Theme.SubText,
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = content,
	})

	local rows = {}
	for index = 1, Quests.PerDay do
		local row = Kit.row(holder, index, function()
			State.action("ClaimQuest", index)
		end)
		row.Icon.Text = "📜"
		rows[index] = row
	end

	return {
		Frame = content.Parent,
		Refresh = function(profile)
			for index, row in rows do
				local quest = profile.Quests.List[index]
				local def = quest and questDefs[quest.Id]
				row.Frame.Visible = def ~= nil
				if quest and def then
					local reward = def.RewardServes * Formulas.serveWorth(profile)
					row.Title.Text = string.format(def.Text, quest.Goal)
					row.Subtitle.Text = `Progress {Format.number(quest.Progress)}/{Format.number(quest.Goal)}  •  Reward {Format.coins(reward)}`
					if quest.Claimed then
						row.Icon.Text = "✅"
						Kit.setButton(row.Button, "Claimed", Theme.Grey, false)
					elseif quest.Progress >= quest.Goal then
						row.Icon.Text = "🎉"
						Kit.setButton(row.Button, "Claim!", Theme.Green, true)
					else
						row.Icon.Text = "📜"
						Kit.setButton(row.Button, "In progress", Theme.Grey, false)
					end
				end
			end
		end,
	}
end

---------------------------------------------------------------------------------------
-- Daily reward
---------------------------------------------------------------------------------------

function InfoPanels.createDaily(Hud)
	local content = Hud.newPanel("Daily", "🎁 DAILY REWARD", Vector2.new(660, 330))
	local track = Kit.frame({ Size = UDim2.new(1, 0, 0, 130), BackgroundTransparency = 1, Parent = content })
	Kit.list(track, 6, true, { HorizontalAlignment = Enum.HorizontalAlignment.Center })

	local tiles = {}
	for day = 1, #Quests.DailyRewardServes do
		local tile = Kit.frame({ Size = UDim2.fromOffset(82, 124), LayoutOrder = day, Parent = track })
		Kit.round(tile, 14)
		local stroke = Kit.stroke(tile, 3, Theme.CardAlt)
		local dayLabel = Kit.text({ Size = UDim2.new(1, 0, 0, 24), Position = UDim2.fromOffset(0, 6), Text = "Day " .. day, TextXAlignment = Enum.TextXAlignment.Center, TextSize = 16, Parent = tile })
		local icon = Kit.text({ Size = UDim2.new(1, 0, 0, 44), Position = UDim2.fromOffset(0, 32), Text = "🪙", TextSize = 34, TextXAlignment = Enum.TextXAlignment.Center, Parent = tile })
		local amount = Kit.text({ Size = UDim2.new(1, -6, 0, 30), Position = UDim2.fromOffset(3, 86), TextXAlignment = Enum.TextXAlignment.Center, TextSize = 15, Font = Theme.Font, Parent = tile })
		tiles[day] = { Frame = tile, Stroke = stroke, Day = dayLabel, Icon = icon, Amount = amount }
	end

	local status = Kit.text({
		Size = UDim2.new(1, 0, 0, 26),
		Position = UDim2.fromOffset(0, 140),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextSize = 16,
		Parent = content,
	})
	local claim = Kit.button({
		Size = UDim2.fromOffset(240, 56),
		Position = UDim2.new(0.5, 0, 1, -4),
		AnchorPoint = Vector2.new(0.5, 1),
		Text = "Claim!",
		TextSize = 26,
		OnClick = function()
			State.action("ClaimDaily")
		end,
		Parent = content,
	})

	return {
		Frame = content.Parent,
		Refresh = function(profile)
			local today = Formulas.dayNumber(os.time())
			local daily = profile.Daily
			local canClaim = daily.LastDay < today
			local streak = daily.Streak
			if canClaim then
				streak = if daily.LastDay == today - 1 then daily.Streak + 1 else 1
			end
			local count = #tiles
			local current = (math.max(streak, 1) - 1) % count + 1
			local worth = Formulas.serveWorth(profile)
			for day, tile in tiles do
				local coins = math.max(Quests.DailyMinimumCoins, Quests.DailyRewardServes[day] * worth)
				tile.Amount.Text = Format.number(coins)
				local claimed = day < current or (day == current and not canClaim)
				tile.Icon.Text = if claimed then "✅" elseif day == count then "💰" else "🪙"
				tile.Frame.BackgroundColor3 = if day == current and canClaim then Theme.Yellow elseif claimed then Theme.CardAlt else Theme.Card
				tile.Stroke.Color = if day == current then Theme.Dark else Theme.CardAlt
			end
			status.Text = if canClaim
				then `Day {streak} streak reward is ready!`
				else `Streak: {daily.Streak} day(s). Come back tomorrow to keep it going!`
			Kit.setButton(claim, if canClaim then "Claim!" else "Claimed today", Theme.Green, canClaim)
		end,
	}
end

---------------------------------------------------------------------------------------
-- Rush info
---------------------------------------------------------------------------------------

function InfoPanels.createRush(Hud)
	local content = Hud.newPanel("Rush", "⚡ CUSTOMER RUSH", Vector2.new(620, 430))
	local status = Kit.title({
		Size = UDim2.new(1, 0, 0, 36),
		TextColor3 = Theme.Red,
		TextSize = 28,
		Parent = content,
	})
	Kit.text({
		Size = UDim2.new(1, 0, 0, 86),
		Position = UDim2.fromOffset(0, 40),
		Font = Theme.BodyFont,
		TextSize = 15,
		TextYAlignment = Enum.TextYAlignment.Top,
		Text = `Every few minutes a crowd of customers hits Business Street for {RushConfig.Duration} seconds. `
			.. "Every shop gets the same customers, so it is all about how fast you serve. "
			.. "Only customers YOU serve score points - VIPs and fast service score more. "
			.. "Top 3 win big coin prizes, and 1st place earns the exclusive Rush Champion Gold awning!",
		Parent = content,
	})
	local boardTitle = Kit.text({ Size = UDim2.new(1, 0, 0, 24), Position = UDim2.fromOffset(0, 130), Font = Theme.Font, TextSize = 20, Parent = content })
	local board = Kit.text({
		Size = UDim2.new(1, 0, 1, -160),
		Position = UDim2.fromOffset(0, 158),
		TextSize = 18,
		TextYAlignment = Enum.TextYAlignment.Top,
		Parent = content,
	})

	local function update()
		local rush = State.Rush
		local now = Workspace:GetServerTimeNow()
		local localId = Players.LocalPlayer.UserId
		local lines = {}
		if rush.Phase == "Active" then
			status.Text = `RUSH IS LIVE!  {Format.clock(rush.EndsAt - now)}`
			boardTitle.Text = "Live scores"
			for index, entry in rush.Scores do
				table.insert(lines, `{index}. {if entry.UserId == localId then "You" else entry.Name}  -  {entry.Points} pts`)
			end
		else
			status.Text = if rush.Phase == "Countdown"
				then "STARTING NOW - get to your shop!"
				else `Next rush in {Format.clock(rush.NextAt - now)}`
			boardTitle.Text = "Last rush"
			for _, entry in rush.Results do
				table.insert(lines, `{entry.Rank}. {if entry.UserId == localId then "You" else entry.Name}  -  {entry.Points} pts  (+{Format.coins(entry.Coins)})`)
			end
		end
		board.Text = if #lines > 0 then table.concat(lines, "\n") else "No scores yet."
	end

	return { Frame = content.Parent, Refresh = update, Tick = update }
end

---------------------------------------------------------------------------------------
-- Settings + stats
---------------------------------------------------------------------------------------

function InfoPanels.createSettings(Hud)
	local content = Hud.newPanel("Settings", "⚙️ SETTINGS", Vector2.new(520, 400))
	Kit.text({ Size = UDim2.new(1, -170, 0, 52), Text = "Sound effects", Font = Theme.Font, TextSize = 22, Parent = content })
	local sfx = Kit.button({
		Size = UDim2.fromOffset(150, 48),
		Position = UDim2.new(1, 0, 0, 2),
		AnchorPoint = Vector2.new(1, 0),
		OnClick = function()
			local profile = State.Profile
			if profile then
				State.action("SetSetting", "Sfx", not (profile.Settings.Sfx ~= false))
			end
		end,
		Parent = content,
	})
	Kit.text({ Size = UDim2.new(1, 0, 0, 26), Position = UDim2.fromOffset(0, 70), Text = "Your stats", Font = Theme.Font, TextSize = 22, Parent = content })
	local stats = Kit.text({
		Size = UDim2.new(1, 0, 1, -130),
		Position = UDim2.fromOffset(0, 100),
		Font = Theme.BodyFont,
		TextSize = 17,
		TextYAlignment = Enum.TextYAlignment.Top,
		Parent = content,
	})
	Kit.text({
		Size = UDim2.new(1, 0, 0, 20),
		Position = UDim2.new(0, 0, 1, -20),
		Text = "Blockheads: Hustle & Collect",
		Font = Theme.BodyFont,
		TextSize = 13,
		TextColor3 = Theme.SubText,
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = content,
	})

	return {
		Frame = content.Parent,
		Refresh = function(profile)
			local on = profile.Settings.Sfx ~= false
			Kit.setButton(sfx, if on then "ON" else "OFF", if on then Theme.Green else Theme.Red, true)
			local s = profile.Stats
			stats.Text = table.concat({
				`Total earned: {Format.coins(profile.TotalEarned)}`,
				`Customers served: {Format.number(s.Served)}`,
				`Customers lost: {Format.number(s.Lost)}`,
				`Best combo: x{s.BestCombo}`,
				`Rush points: {Format.number(s.RushPoints)}`,
				`Rush wins: {s.RushWins}`,
			}, "\n")
		end,
	}
end

return InfoPanels
