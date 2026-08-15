async function testLatency() {
  const start = Date.now();

  const x = await fetch(
    'https://webhook.site/9e0d86d9-e4d1-4147-86e5-0f1cd767490c',
    {
      method: "GET"
    }
  );

  const final = Date.now();

 
  console.log("The Latency time is:", final - start, "ms");
}

testLatency();