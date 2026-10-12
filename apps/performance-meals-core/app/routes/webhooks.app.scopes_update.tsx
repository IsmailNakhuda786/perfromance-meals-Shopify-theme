import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {assertShop} from "../services/security.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, shop } = await authenticate.webhook(request);
  assertShop(shop);

    const current = payload.current as string[];
    if (session) {
        await db.session.update({
            where: {
                id: session.id
            },
            data: {
                scope: current.toString(),
            },
        });
    }
    return new Response();
};
