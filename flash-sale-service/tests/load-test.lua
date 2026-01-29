-- Wrk Lua script for load testing the flash sale service

-- Initialize with random seed
math.randomseed(os.time())

-- Generate random IDs
local function uuid()
    local template = 'xxxx-xxxx'
    return string.gsub(template, '[x]', function ()
        return string.format('%x', math.random(0, 0xf))
    end)
end

-- Request counter
counter = 0

request = function()
    counter = counter + 1
    
    local event_id = "event_" .. math.random(1, 10)
    local seat_id = "seat_" .. string.char(64 + math.random(1, 26)) .. math.random(1, 100)
    local user_id = "user_" .. uuid()
    
    local body = string.format(
        '{"event_id":"%s","seat_id":"%s","user_id":"%s"}',
        event_id, seat_id, user_id
    )
    
    return wrk.format("POST", "/api/v1/book", {
        ["Content-Type"] = "application/json"
    }, body)
end

response = function(status, headers, body)
    if status ~= 201 and status ~= 409 then
        print("Unexpected status: " .. status)
        print("Body: " .. body)
    end
end

done = function(summary, latency, requests)
    io.write("------------------------------\n")
    io.write(string.format("Requests: %d\n", summary.requests))
    io.write(string.format("Duration: %.2fs\n", summary.duration / 1000000))
    io.write(string.format("RPS: %.2f\n", summary.requests / (summary.duration / 1000000)))
    io.write(string.format("Latency (avg): %.2fms\n", latency.mean / 1000))
    io.write(string.format("Latency (p50): %.2fms\n", latency:percentile(50) / 1000))
    io.write(string.format("Latency (p99): %.2fms\n", latency:percentile(99) / 1000))
    io.write(string.format("Errors: %d\n", summary.errors.connect + summary.errors.read + summary.errors.write + summary.errors.timeout))
    io.write("------------------------------\n")
end

