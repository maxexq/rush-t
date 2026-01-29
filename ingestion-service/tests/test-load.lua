-- wrk Lua script for load testing ingestion service
math.randomseed(os.time())

local event_types = {"check_in", "vote", "registration", "click", "view"}

request = function()
    local event_type = event_types[math.random(1, #event_types)]
    local user_id = "user_" .. math.random(1, 1000000)
    
    local body = string.format([[
    {
        "event_type": "%s",
        "user_id": "%s",
        "payload": {
            "timestamp": "%s",
            "data": "test_payload_%d"
        }
    }]], event_type, user_id, os.date("!%Y-%m-%dT%H:%M:%SZ"), math.random(1, 99999))
    
    return wrk.format("POST", "/api/v1/ingest", {
        ["Content-Type"] = "application/json"
    }, body)
end

-- Track response codes
responses = {
    [200] = 0,
    [202] = 0,
    [400] = 0,
    [503] = 0,
    other = 0
}

response = function(status, headers, body)
    if responses[status] then
        responses[status] = responses[status] + 1
    else
        responses.other = responses.other + 1
    end
end

done = function(summary, latency, requests)
    io.write("------------------------------\n")
    io.write("Performance Summary\n")
    io.write("------------------------------\n")
    io.write(string.format("Total requests:    %d\n", summary.requests))
    io.write(string.format("Duration:          %.2fs\n", summary.duration / 1000000))
    io.write(string.format("Requests/sec:      %.2f\n", summary.requests / (summary.duration / 1000000)))
    io.write("\n")
    io.write("Latency Statistics:\n")
    io.write(string.format("  Average:         %.2fms\n", latency.mean / 1000))
    io.write(string.format("  Median (p50):    %.2fms\n", latency:percentile(50) / 1000))
    io.write(string.format("  p95:             %.2fms\n", latency:percentile(95) / 1000))
    io.write(string.format("  p99:             %.2fms\n", latency:percentile(99) / 1000))
    io.write(string.format("  Max:             %.2fms\n", latency.max / 1000))
    io.write("\n")
    io.write("Response Codes:\n")
    io.write(string.format("  200 OK:          %d\n", responses[200]))
    io.write(string.format("  202 Accepted:    %d\n", responses[202]))
    io.write(string.format("  400 Bad Request: %d\n", responses[400]))
    io.write(string.format("  503 Unavailable: %d (load shedding)\n", responses[503]))
    io.write(string.format("  Other:           %d\n", responses.other))
    io.write("\n")
    io.write(string.format("Errors:            %d\n", 
        summary.errors.connect + summary.errors.read + 
        summary.errors.write + summary.errors.timeout))
    io.write("------------------------------\n")
end

