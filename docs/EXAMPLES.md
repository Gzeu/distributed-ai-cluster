# Usage Examples

## Basic Chat Completion

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [
      {"role": "user", "content": "What is distributed computing?"}
    ]
  }'
```

## System Prompt

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [
      {"role": "system", "content": "You are a helpful AI assistant."},
      {"role": "user", "content": "Explain quantum computing."}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

## Python Client

```python
import requests

API_URL = "http://localhost:8080/v1/chat/completions"

def chat(message: str) -> str:
    response = requests.post(API_URL, json={
        "model": "default",
        "messages": [
            {"role": "user", "content": message}
        ],
        "temperature": 0.7,
        "max_tokens": 300
    })
    
    result = response.json()
    return result["choices"][0]["message"]["content"]

# Usage
answer = chat("What is machine learning?")
print(answer)
```

## TypeScript/Node.js Client

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:8080/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: Message[]): Promise<string> {
  const response = await axios.post(API_URL, {
    model: 'default',
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.data.choices[0].message.content;
}

// Usage
const answer = await chat([
  { role: 'user', content: 'Explain AI clustering' },
]);
console.log(answer);
```

## OpenAI SDK Compatible

```python
from openai import OpenAI

# Point to your cluster
client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="not-needed"  # Auth not implemented yet
)

response = client.chat.completions.create(
    model="default",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

## Streaming (Coming Soon)

```python
for chunk in client.chat.completions.create(
    model="default",
    messages=[{"role": "user", "content": "Write a story"}],
    stream=True
):
    print(chunk.choices[0].delta.content, end="")
```

## Check Cluster Status

```bash
curl http://localhost:8080/cluster/status | jq
```

Response:
```json
{
  "nodes": [
    {
      "id": "worker_laptop_abc123",
      "type": "worker",
      "status": "healthy",
      "metrics": {
        "activeRequests": 0,
        "cpuUsage": 25.3,
        "memoryUsage": 45.2
      }
    }
  ],
  "stats": {
    "totalNodes": 3,
    "healthyNodes": 3,
    "activeRequests": 5
  }
}
```

## Load Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test throughput
hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"model":"default","messages":[{"role":"user","content":"Hi"}]}' \
  http://localhost:8080/v1/chat/completions
```
