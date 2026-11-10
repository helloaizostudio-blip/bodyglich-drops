-- UI building blocks shared by the HUD and every panel, so the whole interface has
-- one consistent look: rounded cards, chunky outlined buttons, friendly type.
-- All sizes are in "design pixels"; the HUD scales the whole interface to the screen.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)

local Kit = {}

Kit.make = Make
Kit.SfxEnabled = true

local sounds: { [string]: Sound } = {}

function Kit.playSound(name: string, speed: number?)
	if not Kit.SfxEnabled then
		return
	end
	local sound = sounds[name]
	if not sound then
		local id = Theme.Sounds[name]
		if not id then
			return
		end
		sound = Make("Sound", { Name = "Sfx" .. name, SoundId = id, Volume = 0.5, Parent = SoundService })
		sounds[name] = sound
	end
	sound.PlaybackSpeed = speed or 1
	sound:Play()
end

function Kit.tween(instance: Instance, seconds: number, goal: { [string]: any }, style: Enum.EasingStyle?, direction: Enum.EasingDirection?)
	local tween = TweenService:Create(
		instance,
		TweenInfo.new(seconds, style or Enum.EasingStyle.Quad, direction or Enum.EasingDirection.Out),
		goal
	)
	tween:Play()
	return tween
end

function Kit.round(instance: Instance, pixels: number)
	return Make("UICorner", { CornerRadius = UDim.new(0, pixels), Parent = instance })
end

function Kit.stroke(instance: Instance, thickness: number, color: Color3?)
	return Make("UIStroke", {
		Thickness = thickness,
		Color = color or Theme.Dark,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
		Parent = instance,
	})
end

function Kit.pad(instance: Instance, pixels: number)
	local inset = UDim.new(0, pixels)
	return Make("UIPadding", {
		PaddingLeft = inset,
		PaddingRight = inset,
		PaddingTop = inset,
		PaddingBottom = inset,
		Parent = instance,
	})
end

function Kit.list(parent: Instance, spacing: number, horizontal: boolean?, props: { [string]: any }?)
	local merged = {
		Padding = UDim.new(0, spacing),
		FillDirection = if horizontal then Enum.FillDirection.Horizontal else Enum.FillDirection.Vertical,
		SortOrder = Enum.SortOrder.LayoutOrder,
		Parent = parent,
	}
	if props then
		for key, value in props do
			merged[key] = value
		end
	end
	return Make("UIListLayout", merged)
end

function Kit.frame(props: { [string]: any }): Frame
	local merged = { BackgroundColor3 = Theme.Card, BorderSizePixel = 0 }
	for key, value in props do
		merged[key] = value
	end
	return Make("Frame", merged)
end

function Kit.text(props: { [string]: any }): TextLabel
	local merged = {
		BackgroundTransparency = 1,
		Font = Theme.BoldFont,
		TextColor3 = Theme.Text,
		TextSize = 18,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextWrapped = true,
		Text = "",
	}
	for key, value in props do
		merged[key] = value
	end
	return Make("TextLabel", merged)
end

-- Heading-style text: display font, white with a dark outline.
function Kit.title(props: { [string]: any }): TextLabel
	local merged = {
		Font = Theme.Font,
		TextColor3 = Theme.White,
		TextSize = 26,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextWrapped = false,
	}
	for key, value in props do
		merged[key] = value
	end
	local label = Kit.text(merged)
	Make("UIStroke", { Thickness = 2.5, Color = Theme.Dark, Parent = label })
	return label
end

-- A chunky button. props.OnClick is called on activation (mouse, touch or gamepad).
function Kit.button(props: { [string]: any }): TextButton
	local onClick = props.OnClick
	local color = props.Color or Theme.Green
	local merged = {
		AutoButtonColor = false,
		BackgroundColor3 = color,
		BorderSizePixel = 0,
		Font = Theme.Font,
		TextColor3 = Theme.White,
		TextSize = 20,
		TextStrokeColor3 = Theme.Dark,
		TextStrokeTransparency = 0.35,
		Text = "",
	}
	for key, value in props do
		if key ~= "OnClick" and key ~= "Color" and key ~= "Radius" then
			merged[key] = value
		end
	end
	local button = Make("TextButton", merged)
	Kit.round(button, props.Radius or 12)
	Kit.stroke(button, 2.5)
	local scale = Make("UIScale", { Parent = button })

	button.MouseButton1Down:Connect(function()
		Kit.tween(scale, 0.08, { Scale = 0.93 })
	end)
	local function release()
		Kit.tween(scale, 0.12, { Scale = 1 }, Enum.EasingStyle.Back)
	end
	button.MouseButton1Up:Connect(release)
	button.MouseLeave:Connect(release)
	button.Activated:Connect(function()
		if not button.Active then
			return
		end
		Kit.playSound("Click")
		if onClick then
			onClick(button)
		end
	end)
	return button
end

-- Greys a button out (or restores it) and changes its label.
function Kit.setButton(button: TextButton, text: string, color: Color3, enabled: boolean)
	button.Text = text
	button.BackgroundColor3 = if enabled then color else Theme.Grey
	button.Active = enabled
end

-- A scrolling column that grows with its contents.
function Kit.scroll(props: { [string]: any }): ScrollingFrame
	local merged = {
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 8,
		ScrollBarImageColor3 = Theme.Dark,
		CanvasSize = UDim2.new(0, 0, 0, 0),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}
	for key, value in props do
		merged[key] = value
	end
	local scroll = Make("ScrollingFrame", merged)
	Kit.list(scroll, 8)
	Make("UIPadding", { PaddingRight = UDim.new(0, 12), PaddingBottom = UDim.new(0, 8), PaddingTop = UDim.new(0, 2), PaddingLeft = UDim.new(0, 2), Parent = scroll })
	return scroll
end

-- A list row: emoji icon, title, subtitle and an action button on the right.
-- Returns { Frame, Icon, Title, Subtitle, Button }.
function Kit.row(parent: Instance, order: number, onClick: (() -> ())?)
	local frame = Kit.frame({
		Size = UDim2.new(1, 0, 0, 76),
		LayoutOrder = order,
		Parent = parent,
	})
	Kit.round(frame, 14)
	Kit.stroke(frame, 2, Theme.CardAlt)
	local icon = Kit.text({
		Size = UDim2.fromOffset(56, 56),
		Position = UDim2.fromOffset(10, 10),
		TextSize = 38,
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = frame,
	})
	local title = Kit.text({
		Size = UDim2.new(1, -230, 0, 26),
		Position = UDim2.fromOffset(76, 10),
		Font = Theme.Font,
		TextSize = 21,
		TextWrapped = false,
		TextTruncate = Enum.TextTruncate.AtEnd,
		Parent = frame,
	})
	local subtitle = Kit.text({
		Size = UDim2.new(1, -230, 0, 34),
		Position = UDim2.fromOffset(76, 36),
		Font = Theme.BodyFont,
		TextSize = 14,
		TextColor3 = Theme.SubText,
		TextYAlignment = Enum.TextYAlignment.Top,
		Parent = frame,
	})
	local button = Kit.button({
		Size = UDim2.fromOffset(136, 52),
		Position = UDim2.new(1, -10, 0.5, 0),
		AnchorPoint = Vector2.new(1, 0.5),
		TextSize = 18,
		OnClick = onClick,
		Parent = frame,
	})
	return { Frame = frame, Icon = icon, Title = title, Subtitle = subtitle, Button = button }
end

return Kit
