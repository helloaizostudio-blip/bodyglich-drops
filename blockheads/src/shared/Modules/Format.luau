-- Number and time formatting shared by the server (world signs) and client (UI).

local Format = {}

local SUFFIXES = { "", "K", "M", "B", "T", "Qa" }

-- 1234 -> "1,234"   1234567 -> "1.23M"
function Format.number(value: number): string
	value = math.floor(value + 0.5)
	if value < 100000 then
		local text = tostring(value)
		local formatted = text:reverse():gsub("(%d%d%d)", "%1,"):reverse()
		if formatted:sub(1, 1) == "," then
			formatted = formatted:sub(2)
		end
		return formatted
	end
	local index = 1
	local scaled = value
	while scaled >= 1000 and index < #SUFFIXES do
		scaled /= 1000
		index += 1
	end
	local text
	if scaled >= 100 then
		text = string.format("%.0f", scaled)
	elseif scaled >= 10 then
		text = string.format("%.1f", scaled)
	else
		text = string.format("%.2f", scaled)
	end
	return text .. SUFFIXES[index]
end

function Format.coins(value: number): string
	return "🪙 " .. Format.number(value)
end

-- 75 -> "1:15"
function Format.clock(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	return string.format("%d:%02d", seconds // 60, seconds % 60)
end

function Format.percent(fraction: number): string
	return string.format("%d%%", math.floor(fraction * 100 + 0.5))
end

return Format
