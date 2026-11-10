-- Draws and animates NPC customers on this client.
--
-- The server only replicates one invisible part per customer with attributes
-- describing it (see Server/Services/CustomerService). Here we build the visible
-- Blockhead, walk it along MoveFrom -> MoveTo, and show its order bubble and
-- patience bar. Nothing in this file affects gameplay.

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)
local Customers = require(Shared.Config.Customers)
local Characters = require(Shared.Config.Characters)
local Products = require(Shared.Config.Products)
local BlockheadBuilder = require(Shared.Modules.BlockheadBuilder)

local CustomerRenderer = {}

local TAG = "Customer"
local records: { [BasePart]: any } = {}

local function lookFor(root: BasePart)
	local characterId = root:GetAttribute("CharacterId")
	local character = characterId and Characters.ById[characterId]
	if character then
		return character.Look
	end
	local look = BlockheadBuilder.randomLook(root:GetAttribute("Seed") or 1)
	local customerType = Customers.ById[root:GetAttribute("CType")]
	if customerType then
		if customerType.Shirt then
			look.Shirt = customerType.Shirt
		end
		if customerType.Hat then
			look.Hat = customerType.Hat
			look.HatColor = if customerType.Id == "VIP" then Theme.Yellow else Theme.Dark
		end
	end
	return look
end

local function orderEmojis(root: BasePart): string
	local text = ""
	for _, productId in string.split(root:GetAttribute("Order") or "", ",") do
		local product = Products.ById[productId]
		if product then
			text ..= product.Emoji
		end
	end
	return text
end

local function buildBubble(root: BasePart, record)
	local customerType = Customers.ById[root:GetAttribute("CType")]
	local gui = Make("BillboardGui", {
		Name = "Bubble",
		Size = UDim2.fromScale(4.6, 2.6),
		StudsOffsetWorldSpace = Vector3.new(0, 8.4, 0),
		MaxDistance = 85,
		LightInfluence = 0,
		Parent = root,
	})
	local bubble = Make("Frame", {
		Size = UDim2.fromScale(1, 0.7),
		BackgroundColor3 = Theme.White,
		BorderSizePixel = 0,
		Parent = gui,
	})
	Make("UICorner", { CornerRadius = UDim.new(0.3, 0), Parent = bubble })
	Make("UIStroke", { Thickness = 2.5, Color = Theme.Dark, Parent = bubble })
	local order = Make("TextLabel", {
		Size = UDim2.fromScale(0.94, 0.9),
		Position = UDim2.fromScale(0.5, 0.5),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundTransparency = 1,
		Text = orderEmojis(root),
		TextScaled = true,
		Font = Theme.Font,
		TextColor3 = Theme.Dark,
		Parent = bubble,
	})
	if customerType and customerType.Id ~= "Normal" then
		Make("TextLabel", {
			Name = "Badge",
			Size = UDim2.fromScale(0.32, 0.6),
			Position = UDim2.fromScale(1, 0),
			AnchorPoint = Vector2.new(0.5, 0.5),
			BackgroundTransparency = 1,
			Text = customerType.Emoji,
			TextScaled = true,
			Font = Theme.Font,
			Parent = bubble,
		})
	end
	local barBack = Make("Frame", {
		Size = UDim2.fromScale(0.9, 0.16),
		Position = UDim2.fromScale(0.05, 0.8),
		BackgroundColor3 = Theme.Dark,
		BorderSizePixel = 0,
		Visible = false,
		Parent = gui,
	})
	Make("UICorner", { CornerRadius = UDim.new(1, 0), Parent = barBack })
	local fill = Make("Frame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Theme.Green,
		BorderSizePixel = 0,
		Parent = barBack,
	})
	Make("UICorner", { CornerRadius = UDim.new(1, 0), Parent = fill })

	record.Bubble = bubble
	record.OrderLabel = order
	record.BarBack = barBack
	record.BarFill = fill
end

local function readAttributes(root: BasePart, record)
	record.MoveFrom = root:GetAttribute("MoveFrom")
	record.MoveTo = root:GetAttribute("MoveTo")
	record.MoveStart = root:GetAttribute("MoveStart") or 0
	record.MoveDur = root:GetAttribute("MoveDur") or 0
	record.Face = root:GetAttribute("Face")
	record.PatienceStart = root:GetAttribute("PatienceStart")
	record.PatienceDur = root:GetAttribute("PatienceDur") or 0
	local mood = root:GetAttribute("Mood")
	if mood ~= record.Mood then
		record.Mood = mood
		if mood and record.OrderLabel then
			record.OrderLabel.Text = if mood == "Happy" then "😄" else "😡"
			record.Bubble.BackgroundColor3 = if mood == "Happy" then Color3.fromRGB(214, 255, 220) else Color3.fromRGB(255, 214, 214)
		end
	end
	record.Settled = false
end

local function onAdded(root: Instance)
	if records[root :: BasePart] or not root:IsA("BasePart") then
		return
	end
	local record = { Root = root, Settled = false, Phase = math.random() * 6 }
	records[root] = record
	BlockheadBuilder.attach(root, lookFor(root))
	buildBubble(root, record)
	readAttributes(root, record)
	record.Connection = root.AttributeChanged:Connect(function()
		readAttributes(root, record)
	end)
end

local function onRemoved(root: Instance)
	local record = records[root :: BasePart]
	if record then
		records[root :: BasePart] = nil
		if record.Connection then
			record.Connection:Disconnect()
		end
	end
end

local function step()
	local now = Workspace:GetServerTimeNow()
	for root, record in records do
		if root.Parent == nil then
			onRemoved(root)
			continue
		end
		-- Walking.
		if not record.Settled and record.MoveFrom and record.MoveTo then
			local from: Vector3, to: Vector3 = record.MoveFrom, record.MoveTo
			local alpha = if record.MoveDur > 0 then math.clamp((now - record.MoveStart) / record.MoveDur, 0, 1) else 1
			local position = from:Lerp(to, alpha)
			local direction = to - from
			if alpha >= 1 then
				record.Settled = true
				-- Standing still: face the counter while queueing.
				local target = if record.Face and not record.Mood then record.Face else position + direction
				local flat = Vector3.new(target.X, position.Y, target.Z)
				if (flat - position).Magnitude > 0.05 then
					root.CFrame = CFrame.lookAt(position, flat)
				else
					root.CFrame = CFrame.new(position)
				end
			else
				local hop = math.abs(math.sin((now + record.Phase) * 9)) * 0.35
				local flat = Vector3.new(direction.X, 0, direction.Z)
				local base = position + Vector3.new(0, hop, 0)
				if flat.Magnitude > 0.05 then
					root.CFrame = CFrame.lookAt(base, base + flat)
				else
					root.CFrame = CFrame.new(base)
				end
			end
		end

		-- Patience bar.
		if record.PatienceDur > 0 and record.PatienceStart and not record.Mood then
			local left = 1 - math.clamp((now - record.PatienceStart) / record.PatienceDur, 0, 1)
			record.BarBack.Visible = true
			record.BarFill.Size = UDim2.fromScale(left, 1)
			record.BarFill.BackgroundColor3 = if left > 0.5 then Theme.Green elseif left > 0.25 then Theme.Orange else Theme.Red
		elseif record.BarBack.Visible then
			record.BarBack.Visible = false
		end
	end
end

function CustomerRenderer.Start()
	CollectionService:GetInstanceAddedSignal(TAG):Connect(onAdded)
	CollectionService:GetInstanceRemovedSignal(TAG):Connect(onRemoved)
	for _, root in CollectionService:GetTagged(TAG) do
		onAdded(root)
	end
	RunService.RenderStepped:Connect(step)
end

return CustomerRenderer
