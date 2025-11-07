import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
} from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import {
  SystemService,
  CreateSystemDto,
  UpdateSystemDto,
} from "./system.service";

@Controller("systems")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Public()
  @Get()
  async getAllSystems() {
    return this.systemService.findAll();
  }

  @Public()
  @Get(":id")
  async getSystem(@Param("id") id: string) {
    return this.systemService.findOne(id);
  }

  @Public()
  @Post()
  async createSystem(@Body() createSystemDto: CreateSystemDto) {
    return this.systemService.create(createSystemDto);
  }

  @Public()
  @Put(":id")
  async updateSystem(
    @Param("id") id: string,
    @Body() updateSystemDto: UpdateSystemDto
  ) {
    return this.systemService.update(id, updateSystemDto);
  }

  @Public()
  @Delete(":id")
  async deleteSystem(@Param("id") id: string) {
    const result = await this.systemService.remove(id);
    return { success: result };
  }
}
