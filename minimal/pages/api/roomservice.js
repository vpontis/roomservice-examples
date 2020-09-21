import cookie from "cookie";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

const API_KEY = "U4cdUNKzQEOXQ7egQjdd3";

export default async (req, res) => {
  const body = req.body;
  const user = cookie.parse(req.headers?.cookie || {})["user.id"];

  const r = await fetch("https://super.roomservice.dev/provision", {
    method: "post",
    headers: {
      Authorization: `Bearer: ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: user,
      resources: body.resources,
    }),
  });

  const json = await r.json();
  res.json(json);
};
