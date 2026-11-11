export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(
      `${process.env.ANALYTICS_API_URL}/api/collect/consent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analytics: true,
          policyVersion: "analytics-v2",
        }),
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Analytics consent error:", error);

    return res.status(500).json({
      error: "Analytics consent request failed",
    });
  }
}