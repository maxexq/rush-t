# PowerShell script to produce high-volume Kafka messages for load testing
# Usage: .\produce-kafka-load.ps1 [-MessagesPerSec 100] [-Duration 60]

param(
    [int]$MessagesPerSec = 100,
    [int]$Duration = 60
)

$Topic = "ticket_bookings"
$TotalMessages = $MessagesPerSec * $Duration

Write-Host "Starting Kafka load test:" -ForegroundColor Green
Write-Host "  Messages/sec: $MessagesPerSec"
Write-Host "  Duration: $Duration seconds"
Write-Host "  Topic: $Topic"
Write-Host "  Total messages: $TotalMessages"
Write-Host ""

$StartTime = Get-Date
$EndTime = $StartTime.AddSeconds($Duration)
$MessageCount = 0

while ((Get-Date) -lt $EndTime) {
    $BatchMessages = @()
    
    # Generate batch of messages
    for ($i = 0; $i -lt $MessagesPerSec; $i++) {
        $SeatId = Get-Random -Minimum 1 -Maximum 100
        $UserId = Get-Random -Minimum 1 -Maximum 1000
        $Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        
        $Message = @"
{"seat_id": $SeatId, "user_id": $UserId, "status": "reserved", "timestamp": "$Timestamp"}
"@
        $BatchMessages += $Message
    }
    
    # Send batch to Kafka
    $BatchMessages -join "`n" | docker exec -i ticket_kafka kafka-console-producer `
        --bootstrap-server localhost:9092 `
        --topic $Topic 2>$null
    
    $MessageCount += $MessagesPerSec
    
    # Progress update
    if ($MessageCount % 500 -eq 0) {
        $Elapsed = (Get-Date) - $StartTime
        $Rate = [math]::Round($MessageCount / $Elapsed.TotalSeconds, 2)
        Write-Host "Progress: $MessageCount messages sent ($Rate msg/sec)" -ForegroundColor Yellow
    }
    
    # Rate limiting
    Start-Sleep -Milliseconds 1000
}

Write-Host ""
Write-Host "Load test complete!" -ForegroundColor Green
Write-Host "Total messages sent: $MessageCount"
$ActualRate = [math]::Round($MessageCount / $Duration, 2)
Write-Host "Actual rate: $ActualRate msg/sec"
Write-Host ""
Write-Host "Check Kafka UI at: http://localhost:8080" -ForegroundColor Cyan

