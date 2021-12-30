----------------------------------------------
-- Danmaku Player Backend
-- Au: SJoshua
----------------------------------------------

-- init

local websocket = require("websocket")
local socket = require("socket")
local cjson = require("cjson")
local sqlite3_driver = require("luasql.sqlite3")
local sqlite3_env = sqlite3_driver.sqlite3()

dofile("config.lua")

local ws
local hold = {}
local link = {}
local block = {}

-----------------------------------------------

local danmaku = {
	init = function()
		local con = sqlite3_env:connect(config.db)
		con:execute[[CREATE TABLE danmaku (time, offset, user, comment);]]
		con:close()
	end,
    insert = function(t)
        local con = sqlite3_env:connect(config.db)
        con:execute(("INSERT INTO danmaku (time, offset, user, comment) VALUES (%d, %d, '%s', '%s');"):format(t.time, t.offset, con:escape(t.user), con:escape(t.comment)))
        con:close()
    end,
    get = function()
        local con = sqlite3_env:connect(config.db)
        local cur = con:execute("SELECT time, offset, user, comment FROM danmaku;")
        local ret = {}
        repeat
            local t, o, u, c = cur:fetch()
            if t then
                table.insert(ret, {time = t, offset = o, user = u, comment = c})
            end
        until not t
        cur:close()
        con:close()
        return ret
    end
}

function logprint(...)
	io.write(os.date(), " | ")
	print(...)
end

function flogprint(...)
	local f = io.open(config.log, "a")
	f:write(os.date(), " | ")
	f:write(...)
	f:write("\n")
	f:close()
end

function register(s) 
	hold[s:socket()] = s
	table.insert(link, s:socket())
end

function unregister(s)
	for i = 1, #link do
		if hold[link[i]] == s then
			table.remove(link, i)
			break
		end
	end
	for k, v in pairs(hold) do
		if v == s then
			hold[k] = nil
			break
		end
	end
end

function load()
	local f = io.open("block", "r")
	for line in f:lines() do
		block[line] = true
	end
	f:close()
end

function send(ws, tp, data)
	ws:send(cjson.encode({type = tp, data = data}) .. "\n")
end

function broadcast(tp, data)
	for _, s in pairs(hold) do
		if s ~= ws then
			send(s, tp, data)
		end
	end
end

function filter(str)
	for k, v in pairs(block) do
		str = str:gsub(k, "***")
	end
	return str
end

hook = {
	request_all = function(ws, msg)
		send(ws, "danmaku", cjson.encode(danmaku.get()))
	end,
	new_comment = function(ws, msg)
		msg.user = msg.user or "Anonymous"
		if type(msg.comment) ~= "string" then
			return send(ws, "error", "invaild comment")
		end
		if type(msg.time) ~= "number" then
			return send(ws, "error", "invaild time")
		end
		if type(msg.offset) ~= "number" then
			return send(ws, "error", "invaild offset")
		end
 		local t = {time = math.floor(msg.time), offset = math.floor(msg.offset), comment = filter(msg.comment), user = msg.user}
		danmaku.insert(t)
		broadcast("danmaku", {t})
	end
}

function process(ws, msg) 
	local s, r = pcall(cjson.decode, msg)
	if not s then
		return send(ws, "error", "broken json")
	end
	if not r.method then
		return send(ws, "error", "missing method")
	end
	if not hook[r.method] then
		return send(ws, "error", "unknown method")
	end
	return hook[r.method](ws, r)
end

function main()
	logprint("Link start.")

	ws = websocket.bind(config.addr, config.port)
	hold = {}
	link = {}

	danmaku.init()

	logprint("register: server client (" .. ws:socket() .. ")")

	register(ws)

	load()

	while true do
		local t = ws:select(link, nil, 5)
		if type(t) == "number" then
			t = {t}
		end
		if type(t) == "table" then
			for _, k in pairs(t) do 
				k = math.floor(k)
				print("select: " .. (k or "..."))
				local r = hold[k]
				if r == ws then
					local ns = r:accept()
					logprint("accept: " .. ns:socket())
					logprint("handshake: " .. ns:socket())
					ns:handshake("")
					register(ns)
				else
					logprint("request from: " .. k)
					print(r)
					socket.sleep(1)
					local res = r:recv()
					if not res then 
						logprint("disconnected: " .. tostring(r))
						unregister(r)
					else 
						logprint("received: ", tostring(res))
						process(r, res)
					end
				end
			end
		end
	end

	ws:close()

	logprint("Server terminated.")
end

while true do
	local _, err = pcall(main)
	flogprint(err)
end
