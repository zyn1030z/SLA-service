import { Body, Controller, Post } from "@nestjs/common";

@Controller("odoo")
export class OdooController {
  @Post("auto-approve")
  async autoApprove(@Body() body: unknown) {
    // TODO: call Odoo callback API
    return { ok: true };
  }
}
