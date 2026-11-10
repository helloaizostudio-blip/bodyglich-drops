-- The always-visible HUD (coins, level, menu buttons, rush banner, toasts) and the
-- manager for pop-up panels. Everything is created from code into one ScreenGui in
-- PlayerGui called "BlockheadsUI" - there is nothing to set up in StarterGui.
--
-- Layout (kept clear of the mobile thumbstick and jump button):
--   top centre    coins, level + XP, combo, rush banner, toasts
--   top left      Quests, Daily, Rush, My Shop, Settings
--   bottom centre Shop, Team, Upgrades, Collection

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Theme = require(Shared.Config.Theme)
local Format = require(Shared.Modules.Format)
local Formulas = require(Shared.Modules.Formulas)
local Kit = require(script.Parent.Parent.UI.Kit)
local State = require(script.Parent.State)

local Hud = {
	Gui = nil :: ScreenGui?,
	Root = nil :: Frame?,
	Panels = {} :: { [string]: any },
	OpenName = nil :: string?,
}

local player = Players.LocalPlayer
local uiScale: UIScale
local backdrop: TextButton
local coinLabel: TextLabel
local levelLabel: TextLabel
local xpFill: Frame
local comboLabel: TextLabel
local rushBanner: Frame
local rushTitle: TextLabel
local rushLine: TextLabel
local toastHolder: Frame
local bannerFrame: Frame
local bannerTitle: TextLabel
local bannerSub: TextLabel
local hintFrame: Frame
local hintLabel: TextLabel
local badges: { [string]: Frame } = {}
local bannerQueue: { any } = {}
local bannerBusy = false
local lastCoins: number? = nil

---------------------------------------------------------------------------------------
-- Scaling
---------------------------------------------------------------------------------------

local function rescale()
	local camera = Workspace.CurrentCamera
	local size = if camera then camera.ViewportSize else Vector2.new(1280, 720)
	local scale = math.clamp(math.min(size.X / 1280, size.Y / 720), 0.6, 1.35)
	uiScale.Scale = scale
	-- The root is sized up by 1/scale so that after scaling it still fills the screen.
	Hud.Root.Size = UDim2.fromScale(1 / scale, 1 / scale)
end

---------------------------------------------------------------------------------------
-- Panels
---------------------------------------------------------------------------------------

-- Creates an empty pop-up panel. Returns the content frame to fill in.
function Hud.newPanel(name: string, title: string, size: Vector2?): Frame
	local dimensions = size or Vector2.new(660, 470)
	-- A text-less button rather than a Frame: it swallows clicks, so tapping the
	-- panel background (or a disabled button) does not fall through to the backdrop
	-- and close the panel.
	local frame = Kit.make("TextButton", {
		Name = name .. "Panel",
		Size = UDim2.fromOffset(dimensions.X, dimensions.Y),
		Position = UDim2.fromScale(0.5, 0.5),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundColor3 = Theme.Panel,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = "",
		Visible = false,
		ZIndex = 20,
		Parent = Hud.Root,
	})
	Kit.round(frame, 22)
	Kit.stroke(frame, 4)
	Kit.make("UIScale", { Name = "Pop", Parent = frame })

	local header = Kit.frame({
		Name = "Header",
		Size = UDim2.new(1, 0, 0, 58),
		BackgroundColor3 = Theme.Yellow,
		Parent = frame,
	})
	Kit.round(header, 22)
	-- Square off the header's bottom corners.
	Kit.frame({ Size = UDim2.new(1, 0, 0, 22), Position = UDim2.new(0, 0, 1, -22), BackgroundColor3 = Theme.Yellow, Parent = header })
	Kit.frame({ Size = UDim2.new(1, 0, 0, 4), Position = UDim2.new(0, 0, 1, -2), BackgroundColor3 = Theme.Dark, Parent = header })
	Kit.title({
		Name = "Title",
		Size = UDim2.new(1, -120, 1, 0),
		Position = UDim2.fromOffset(60, 0),
		Text = title,
		TextSize = 30,
		Parent = header,
	})
	Kit.button({
		Name = "Close",
		Size = UDim2.fromOffset(44, 44),
		Position = UDim2.new(1, -8, 0, 7),
		AnchorPoint = Vector2.new(1, 0),
		Color = Theme.Red,
		Text = "X",
		TextSize = 24,
		OnClick = function()
			Hud.close()
		end,
		Parent = header,
	})

	return Kit.frame({
		Name = "Content",
		Size = UDim2.new(1, -28, 1, -86),
		Position = UDim2.fromOffset(14, 72),
		BackgroundTransparency = 1,
		Parent = frame,
	})
end

-- Adds a row of tab buttons to a panel content frame.
-- Returns { [tabName] = pageFrame } and a function select(tabName).
function Hud.newTabs(content: Frame, names: { string })
	local bar = Kit.frame({ Name = "Tabs", Size = UDim2.new(1, 0, 0, 44), BackgroundTransparency = 1, Parent = content })
	Kit.list(bar, 8, true)
	local pages, buttons = {}, {}
	local function selectTab(target: string)
		for name, page in pages do
			page.Visible = name == target
			buttons[name].BackgroundColor3 = if name == target then Theme.Blue else Theme.Grey
		end
	end
	for index, name in names do
		buttons[name] = Kit.button({
			Size = UDim2.fromOffset(150, 40),
			LayoutOrder = index,
			Color = Theme.Grey,
			Text = name,
			TextSize = 18,
			OnClick = function()
				selectTab(name)
			end,
			Parent = bar,
		})
		pages[name] = Kit.frame({
			Name = name,
			Size = UDim2.new(1, 0, 1, -52),
			Position = UDim2.fromOffset(0, 52),
			BackgroundTransparency = 1,
			Visible = false,
			Parent = content,
		})
	end
	selectTab(names[1])
	return pages, selectTab
end

function Hud.registerPanel(name: string, panel: any)
	Hud.Panels[name] = panel
end

function Hud.close()
	local name = Hud.OpenName
	if not name then
		return
	end
	Hud.OpenName = nil
	Hud.Panels[name].Frame.Visible = false
	backdrop.Visible = false
end

-- Opens a panel by name. "Shop:Style" opens the Shop panel on its Style tab.
function Hud.open(target: string)
	local name, tab = target, nil
	local split = string.find(target, ":", 1, true)
	if split then
		name, tab = string.sub(target, 1, split - 1), string.sub(target, split + 1)
	end
	local panel = Hud.Panels[name]
	if not panel then
		return
	end
	if Hud.OpenName and Hud.OpenName ~= name then
		Hud.close()
	end
	Hud.OpenName = name
	backdrop.Visible = true
	panel.Frame.Visible = true
	if panel.Opened then
		panel.Opened(tab)
	end
	if State.Profile and panel.Refresh then
		panel.Refresh(State.Profile)
	end
	local pop = panel.Frame:FindFirstChild("Pop")
	if pop then
		pop.Scale = 0.85
		Kit.tween(pop, 0.18, { Scale = 1 }, Enum.EasingStyle.Back)
	end
end

function Hud.toggle(target: string)
	local name = string.split(target, ":")[1]
	if Hud.OpenName == name then
		Hud.close()
	else
		Hud.open(target)
	end
end

---------------------------------------------------------------------------------------
-- Toasts, banners, hints
---------------------------------------------------------------------------------------

local TOAST_COLORS = {
	Success = Theme.Green,
	Error = Theme.Red,
	Reward = Theme.Orange,
	Info = Theme.Blue,
}

function Hud.toast(text: string, kind: string?)
	local children = toastHolder:GetChildren()
	local count = 0
	for _, child in children do
		if child:IsA("Frame") then
			count += 1
		end
	end
	if count >= 4 then
		return
	end
	local toast = Kit.frame({
		Size = UDim2.fromOffset(440, 40),
		BackgroundColor3 = TOAST_COLORS[kind or "Info"] or Theme.Blue,
		Parent = toastHolder,
	})
	Kit.round(toast, 12)
	Kit.stroke(toast, 2.5)
	Kit.title({ Size = UDim2.new(1, -16, 1, 0), Position = UDim2.fromOffset(8, 0), Text = text, TextSize = 18, TextScaled = true, Parent = toast })
	Kit.make("UITextSizeConstraint", { MaxTextSize = 18, MinTextSize = 10, Parent = toast:FindFirstChildOfClass("TextLabel") })
	if kind == "Error" then
		Kit.playSound("Error")
	end
	task.delay(3, function()
		toast:Destroy()
	end)
end

local function showNextBanner()
	if bannerBusy then
		return
	end
	local item = table.remove(bannerQueue, 1)
	if not item then
		return
	end
	bannerBusy = true
	bannerTitle.Text = item.Title
	bannerSub.Text = item.Subtitle or ""
	bannerFrame.BackgroundColor3 = item.Color or Theme.Orange
	bannerFrame.Visible = true
	local pop = bannerFrame:FindFirstChild("Pop") :: UIScale
	pop.Scale = 0.6
	Kit.tween(pop, 0.25, { Scale = 1 }, Enum.EasingStyle.Back)
	if item.Sound then
		Kit.playSound(item.Sound)
	end
	task.delay(item.Seconds or 2.6, function()
		bannerFrame.Visible = false
		bannerBusy = false
		showNextBanner()
	end)
end

-- A big centred announcement. Banners queue up and show one at a time.
function Hud.banner(title: string, subtitle: string?, color: Color3?, sound: string?, seconds: number?)
	table.insert(bannerQueue, { Title = title, Subtitle = subtitle, Color = color, Sound = sound, Seconds = seconds })
	showNextBanner()
end

-- The tutorial / helper line above the bottom buttons. nil hides it.
function Hud.setHint(text: string?)
	hintFrame.Visible = text ~= nil
	if text then
		hintLabel.Text = text
	end
end

---------------------------------------------------------------------------------------
-- HUD construction
---------------------------------------------------------------------------------------

local function menuButton(parent: Instance, order: number, emoji: string, caption: string, color: Color3, onClick: () -> (), small: boolean?): TextButton
	local button = Kit.button({
		Name = caption,
		Size = if small then UDim2.fromOffset(66, 62) else UDim2.fromOffset(78, 72),
		LayoutOrder = order,
		Color = color,
		Text = "",
		OnClick = onClick,
		Parent = parent,
	})
	Kit.text({
		Size = UDim2.new(1, 0, 0, if small then 34 else 40),
		Position = UDim2.fromOffset(0, 4),
		Text = emoji,
		TextSize = if small then 28 else 34,
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = button,
	})
	Kit.title({
		Size = UDim2.new(1, 0, 0, 22),
		Position = UDim2.new(0, 0, 1, -26),
		Text = caption,
		TextSize = if small then 13 else 15,
		Parent = button,
	})
	local badge = Kit.frame({
		Name = "Badge",
		Size = UDim2.fromOffset(20, 20),
		Position = UDim2.new(1, -4, 0, 4),
		AnchorPoint = Vector2.new(1, 0),
		BackgroundColor3 = Theme.Red,
		Visible = false,
		Parent = button,
	})
	Kit.round(badge, 10)
	Kit.stroke(badge, 2, Theme.White)
	badges[caption] = badge
	return button
end

local function build()
	local gui = Kit.make("ScreenGui", {
		Name = "BlockheadsUI",
		ResetOnSpawn = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = 10,
	})
	Hud.Gui = gui
	local root = Kit.frame({ Name = "Root", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = gui })
	Hud.Root = root
	uiScale = Kit.make("UIScale", { Parent = root })

	-- Top bar: coins + level.
	local top = Kit.frame({
		Name = "Top",
		Size = UDim2.fromOffset(460, 50),
		Position = UDim2.new(0.5, 0, 0, 8),
		AnchorPoint = Vector2.new(0.5, 0),
		BackgroundTransparency = 1,
		Parent = root,
	})
	Kit.list(top, 12, true, { HorizontalAlignment = Enum.HorizontalAlignment.Center })

	local coinPill = Kit.frame({ Name = "Coins", Size = UDim2.fromOffset(220, 50), LayoutOrder = 1, BackgroundColor3 = Theme.Yellow, Parent = top })
	Kit.round(coinPill, 25)
	Kit.stroke(coinPill, 3)
	Kit.make("UIScale", { Name = "Pulse", Parent = coinPill })
	coinLabel = Kit.title({ Size = UDim2.new(1, -20, 1, 0), Position = UDim2.fromOffset(10, 0), Text = "🪙 0", TextSize = 26, Parent = coinPill })

	local levelPill = Kit.frame({ Name = "Level", Size = UDim2.fromOffset(200, 50), LayoutOrder = 2, BackgroundColor3 = Theme.Blue, ClipsDescendants = true, Parent = top })
	Kit.round(levelPill, 25)
	Kit.stroke(levelPill, 3)
	xpFill = Kit.frame({ Name = "XP", Size = UDim2.fromScale(0, 1), BackgroundColor3 = Theme.Purple, Parent = levelPill })
	Kit.round(xpFill, 25) -- ClipsDescendants does not clip to rounded corners
	levelLabel = Kit.title({ Size = UDim2.fromScale(1, 1), Text = "⭐ Level 1", TextSize = 22, ZIndex = 2, Parent = levelPill })

	comboLabel = Kit.title({
		Name = "Combo",
		Size = UDim2.fromOffset(460, 28),
		Position = UDim2.new(0.5, 0, 0, 62),
		AnchorPoint = Vector2.new(0.5, 0),
		Text = "",
		TextSize = 22,
		TextColor3 = Theme.Orange,
		Visible = false,
		Parent = root,
	})

	-- Rush banner.
	rushBanner = Kit.frame({
		Name = "Rush",
		Size = UDim2.fromOffset(480, 70),
		Position = UDim2.new(0.5, 0, 0, 94),
		AnchorPoint = Vector2.new(0.5, 0),
		BackgroundColor3 = Theme.Red,
		Visible = false,
		Parent = root,
	})
	Kit.round(rushBanner, 16)
	Kit.stroke(rushBanner, 3)
	rushTitle = Kit.title({ Size = UDim2.new(1, 0, 0, 36), Position = UDim2.fromOffset(0, 2), Text = "", TextSize = 26, Parent = rushBanner })
	rushLine = Kit.title({ Size = UDim2.new(1, -16, 0, 26), Position = UDim2.fromOffset(8, 38), Text = "", TextSize = 16, TextTruncate = Enum.TextTruncate.AtEnd, Parent = rushBanner })

	-- Toasts.
	toastHolder = Kit.frame({
		Name = "Toasts",
		Size = UDim2.fromOffset(440, 200),
		Position = UDim2.new(0.5, 0, 0, 172),
		AnchorPoint = Vector2.new(0.5, 0),
		BackgroundTransparency = 1,
		ZIndex = 40,
		Parent = root,
	})
	Kit.list(toastHolder, 6)

	-- Top-left row. It sits along the top edge on purpose: on phones the lower-left
	-- of the screen is the movement thumbstick area and must stay empty.
	local left = Kit.frame({
		Name = "TopLeft",
		Size = UDim2.fromOffset(360, 62),
		Position = UDim2.fromOffset(12, 8),
		BackgroundTransparency = 1,
		Parent = root,
	})
	Kit.list(left, 6, true)
	menuButton(left, 1, "📜", "Quests", Theme.Purple, function()
		Hud.toggle("Quests")
	end, true)
	menuButton(left, 2, "🎁", "Daily", Theme.Green, function()
		Hud.toggle("Daily")
	end, true)
	menuButton(left, 3, "⚡", "Rush", Theme.Red, function()
		Hud.toggle("Rush")
	end, true)
	menuButton(left, 4, "🏠", "My Shop", Theme.Blue, function()
		State.action("TeleportHome")
	end, true)
	menuButton(left, 5, "⚙️", "Settings", Theme.Grey, function()
		Hud.toggle("Settings")
	end, true)

	-- Bottom row.
	local bottom = Kit.frame({
		Name = "Bottom",
		Size = UDim2.fromOffset(360, 72),
		Position = UDim2.new(0.5, 0, 1, -10),
		AnchorPoint = Vector2.new(0.5, 1),
		BackgroundTransparency = 1,
		Parent = root,
	})
	Kit.list(bottom, 10, true, { HorizontalAlignment = Enum.HorizontalAlignment.Center })
	menuButton(bottom, 1, "🛒", "Shop", Theme.Orange, function()
		Hud.toggle("Shop")
	end)
	menuButton(bottom, 2, "🧱", "Team", Theme.Blue, function()
		Hud.toggle("Characters:Team")
	end)
	menuButton(bottom, 3, "⬆️", "Upgrades", Theme.Green, function()
		Hud.toggle("Upgrades")
	end)
	menuButton(bottom, 4, "📖", "Collection", Theme.Pink, function()
		Hud.toggle("Characters:Collection")
	end)

	-- Tutorial hint.
	hintFrame = Kit.frame({
		Name = "Hint",
		Size = UDim2.fromOffset(520, 50),
		Position = UDim2.new(0.5, 0, 1, -92),
		AnchorPoint = Vector2.new(0.5, 1),
		BackgroundColor3 = Theme.Dark,
		BackgroundTransparency = 0.15,
		Visible = false,
		Parent = root,
	})
	Kit.round(hintFrame, 14)
	Kit.stroke(hintFrame, 2.5, Theme.Yellow)
	hintLabel = Kit.text({
		Size = UDim2.new(1, -20, 1, -8),
		Position = UDim2.fromOffset(10, 4),
		TextColor3 = Theme.White,
		TextSize = 17,
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = hintFrame,
	})

	-- Dark backdrop behind panels; clicking it closes the open panel.
	backdrop = Kit.make("TextButton", {
		Name = "Backdrop",
		Modal = true, -- frees the mouse in first person / shift-lock while a panel is open
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.55,
		BorderSizePixel = 0,
		Text = "",
		AutoButtonColor = false,
		Visible = false,
		ZIndex = 15,
		Parent = root,
	})
	backdrop.Activated:Connect(function()
		Hud.close()
	end)

	-- Announcement banner.
	bannerFrame = Kit.frame({
		Name = "Banner",
		Size = UDim2.fromOffset(560, 120),
		Position = UDim2.fromScale(0.5, 0.3),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundColor3 = Theme.Orange,
		Visible = false,
		ZIndex = 50,
		Parent = root,
	})
	Kit.round(bannerFrame, 22)
	Kit.stroke(bannerFrame, 4)
	Kit.make("UIScale", { Name = "Pop", Parent = bannerFrame })
	bannerTitle = Kit.title({ Size = UDim2.new(1, -20, 0, 60), Position = UDim2.fromOffset(10, 8), TextSize = 36, TextScaled = true, ZIndex = 51, Parent = bannerFrame })
	Kit.make("UITextSizeConstraint", { MaxTextSize = 36, MinTextSize = 14, Parent = bannerTitle })
	bannerSub = Kit.title({ Size = UDim2.new(1, -20, 0, 40), Position = UDim2.fromOffset(10, 70), TextSize = 22, TextScaled = true, ZIndex = 51, Parent = bannerFrame })
	Kit.make("UITextSizeConstraint", { MaxTextSize = 22, MinTextSize = 12, Parent = bannerSub })

	gui.Parent = player:WaitForChild("PlayerGui")
end

---------------------------------------------------------------------------------------
-- Live updates
---------------------------------------------------------------------------------------

function Hud.setBadge(caption: string, visible: boolean)
	local badge = badges[caption]
	if badge then
		badge.Visible = visible
	end
end

local function refresh(profile)
	coinLabel.Text = Format.coins(profile.Coins)
	if lastCoins and profile.Coins > lastCoins then
		local pulse = coinLabel.Parent:FindFirstChild("Pulse")
		if pulse then
			pulse.Scale = 1.12
			Kit.tween(pulse, 0.25, { Scale = 1 })
		end
	end
	lastCoins = profile.Coins

	levelLabel.Text = `⭐ Level {profile.Level}`
	local needed = Formulas.xpForLevel(profile.Level)
	xpFill.Size = UDim2.fromScale(math.clamp(profile.XP / needed, 0, 1), 1)

	Kit.SfxEnabled = profile.Settings.Sfx ~= false

	-- Notification dots.
	local questReady = false
	for _, quest in profile.Quests.List do
		if quest.Progress >= quest.Goal and not quest.Claimed then
			questReady = true
		end
	end
	Hud.setBadge("Quests", questReady)
	Hud.setBadge("Daily", profile.Daily.LastDay < Formulas.dayNumber(os.time()))

	local open = Hud.OpenName and Hud.Panels[Hud.OpenName]
	if open and open.Refresh then
		open.Refresh(profile)
	end
end

local function refreshCombo()
	local combo = player:GetAttribute("Combo") or 0
	if combo >= 2 then
		comboLabel.Text = `🔥 x{combo} COMBO  +{Format.percent(Formulas.comboBonus(combo - 1))}`
		comboLabel.Visible = true
	else
		comboLabel.Visible = false
	end
end

local function place(rank: number): string
	return if rank == 1 then "🥇" elseif rank == 2 then "🥈" elseif rank == 3 then "🥉" else `#{rank}`
end

local function refreshRush()
	local rush = State.Rush
	local now = Workspace:GetServerTimeNow()
	Hud.setBadge("Rush", rush.Phase ~= "Idle")
	if rush.Phase == "Active" then
		rushBanner.Visible = true
		rushBanner.BackgroundColor3 = Theme.Red
		rushTitle.Text = `⚡ CUSTOMER RUSH!  {Format.clock(rush.EndsAt - now)}`
		local parts = {}
		for index, entry in rush.Scores do
			if index > 3 then
				break
			end
			local name = if entry.UserId == player.UserId then "You" else entry.Name
			table.insert(parts, `{place(index)} {name} {entry.Points}`)
		end
		rushLine.Text = if #parts > 0 then table.concat(parts, "   ") else "Serve customers to score!"
	elseif rush.Phase == "Countdown" then
		rushBanner.Visible = true
		rushBanner.BackgroundColor3 = Theme.Orange
		rushTitle.Text = `CUSTOMER RUSH STARTING!  {math.max(0, math.ceil(rush.EndsAt - now))}`
		rushLine.Text = "Get to your shop!"
	else
		rushBanner.Visible = false
	end
end

function Hud.Start()
	build()
	rescale()
	local camera = Workspace.CurrentCamera
	if camera then
		camera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
	end

	State.Changed:Connect(refresh)
	if State.Profile then
		refresh(State.Profile)
	end
	State.Message:Connect(Hud.toast)
	State.RushChanged:Connect(refreshRush)
	player:GetAttributeChangedSignal("Combo"):Connect(refreshCombo)

	task.spawn(function()
		while true do
			task.wait(0.25)
			refreshRush()
			local open = Hud.OpenName and Hud.Panels[Hud.OpenName]
			if open and open.Tick then
				open.Tick()
			end
		end
	end)
end

return Hud
