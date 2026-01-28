import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SystemEntity } from "../../entities/system.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { RecordEntity } from "../../entities/record.entity";
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from "class-validator";
// import { ApiProperty } from "@nestjs/swagger";

export class CreateSystemDto {
  // @ApiProperty({ description: "System name" })
  @IsString()
  @IsNotEmpty()
  systemName!: string;

  // @ApiProperty({ description: "System description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  // @ApiProperty({ description: "Base URL", required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  baseUrl?: string;

  // @ApiProperty({ description: "API Key", required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  // @ApiProperty({ description: "System enabled", required: false, default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // @ApiProperty({ description: "System color", required: false, default: "#3B82F6" })
  @IsOptional()
  @IsString()
  color?: string;

  // @ApiProperty({ description: "System icon", required: false, default: "🏢" })
  @IsOptional()
  @IsString()
  icon?: string;

  // API Configuration fields
  // @ApiProperty({ description: "Workflow endpoint", required: false })
  @IsOptional()
  @IsString()
  workflowEndpoint?: string;

  // @ApiProperty({ description: "API method", required: false, default: "POST" })
  @IsOptional()
  @IsString()
  apiMethod?: string;

  // @ApiProperty({ description: "API headers", required: false })
  @IsOptional()
  apiHeaders?: Record<string, any>;

  // @ApiProperty({ description: "API request body", required: false })
  @IsOptional()
  apiRequestBody?: Record<string, any>;
}

export class UpdateSystemDto {
  // @ApiProperty({ description: "System name", required: false })
  name?: string;

  // @ApiProperty({ description: "System description", required: false })
  description?: string;

  // @ApiProperty({ description: "Base URL", required: false })
  baseUrl?: string;

  // @ApiProperty({ description: "API Key", required: false })
  apiKey?: string;

  // @ApiProperty({ description: "System enabled", required: false })
  enabled?: boolean;

  // @ApiProperty({ description: "System status", enum: ["connected", "disconnected", "error"], required: false })
  status?: "connected" | "disconnected" | "error";

  // @ApiProperty({ description: "System color", required: false })
  color?: string;

  // @ApiProperty({ description: "System icon", required: false })
  icon?: string;

  // @ApiProperty({ description: "Last sync time", required: false })
  lastSync?: Date;

  // API Configuration fields
  // @ApiProperty({ description: "Workflow endpoint", required: false })
  workflowEndpoint?: string;

  // @ApiProperty({ description: "API method", required: false })
  apiMethod?: string;

  // @ApiProperty({ description: "API headers", required: false })
  apiHeaders?: Record<string, any>;

  // @ApiProperty({ description: "API request body", required: false })
  apiRequestBody?: Record<string, any>;
}

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SystemEntity)
    private systemRepository: Repository<SystemEntity>,
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>
  ) {}

  async findAll(): Promise<SystemEntity[]> {
    const systems = await this.systemRepository.find({
      order: { createdAt: "DESC" },
    });

    // Calculate violations count from records table for each system
    const systemIds = systems.map(s => s.id);
    if (systemIds.length > 0) {
      const violationsCounts = await this.systemRepository
        .createQueryBuilder("s")
        .leftJoin("records", "r", "r.system_id = s.id AND r.status = :status", { status: "violated" })
        .select("s.id", "systemId")
        .addSelect("COUNT(r.id)", "violationsCount")
        .where("s.id IN (:...ids)", { ids: systemIds })
        .groupBy("s.id")
        .getRawMany();

      // Map violations count back to systems
      const violationsMap = new Map<number, number>();
      violationsCounts.forEach(v => {
        violationsMap.set(v.systemId, parseInt(v.violationsCount) || 0);
      });

      systems.forEach(system => {
        system.violationsCount = violationsMap.get(system.id) || 0;
      });
    }

    return systems;
  }

  async findOne(id: string | number): Promise<SystemEntity | null> {
    return this.systemRepository.findOne({ where: { id: Number(id) } });
  }

  async create(createSystemDto: CreateSystemDto): Promise<SystemEntity> {
    // Validate and clean systemName
    if (!createSystemDto.systemName || createSystemDto.systemName.trim() === '') {
      throw new Error('System name is required and cannot be empty');
    }
    
    // Clean the systemName (remove extra whitespace, handle encoding)
    const cleanedSystemName = createSystemDto.systemName.trim();
    
    // Frontend có thể gửi 'name' thay vì 'systemName' -> map lại để tránh NOT NULL violation
    const payload: any = { 
      ...createSystemDto,
      systemName: cleanedSystemName 
    };
    
    if (!payload.systemName && payload.name) {
      payload.systemName = payload.name.trim();
      delete payload.name;
    }
    
    const system = this.systemRepository.create(
      payload as Partial<SystemEntity>
    ) as SystemEntity;
    return this.systemRepository.save(system as SystemEntity);
  }

  async update(
    id: string | number,
    updateSystemDto: UpdateSystemDto
  ): Promise<SystemEntity | null> {
    const system = await this.findOne(id);
    if (!system) {
      return null;
    }

    // Map frontend fields to entity fields
    if (updateSystemDto.name !== undefined) {
      system.systemName = updateSystemDto.name;
    }
    if (updateSystemDto.baseUrl !== undefined && updateSystemDto.baseUrl !== null) {
      system.baseUrl = updateSystemDto.baseUrl;
    }
    if (updateSystemDto.description !== undefined && updateSystemDto.description !== null) {
      system.description = updateSystemDto.description;
    }
    if (updateSystemDto.apiKey !== undefined && updateSystemDto.apiKey !== null) {
      system.apiKey = updateSystemDto.apiKey;
    }
    if (updateSystemDto.enabled !== undefined) {
      system.enabled = updateSystemDto.enabled;
    }
    if (updateSystemDto.color !== undefined) {
      system.color = updateSystemDto.color;
    }
    if (updateSystemDto.icon !== undefined) {
      system.icon = updateSystemDto.icon;
    }
    if (updateSystemDto.workflowEndpoint !== undefined) {
      system.workflowEndpoint = updateSystemDto.workflowEndpoint;
    }
    if (updateSystemDto.apiMethod !== undefined) {
      system.apiMethod = updateSystemDto.apiMethod;
    }
    if (updateSystemDto.apiHeaders !== undefined) {
      system.apiHeaders = updateSystemDto.apiHeaders;
    }
    if (updateSystemDto.apiRequestBody !== undefined) {
      system.apiRequestBody = updateSystemDto.apiRequestBody;
    }
    if (updateSystemDto.status !== undefined) {
      system.status = updateSystemDto.status;
    }
    if (updateSystemDto.lastSync !== undefined) {
      system.lastSync = updateSystemDto.lastSync;
    }

    const updatedSystem = await this.systemRepository.save(system);

    // Update systemName in all workflows for this system
    if (updateSystemDto.name !== undefined) {
      await this.workflowRepository.update(
        { systemId: Number(id) },
        { systemName: updateSystemDto.name }
      );
    }

    return updatedSystem;
  }

  async remove(id: string | number): Promise<boolean> {
    const result = await this.systemRepository.delete(Number(id));
    return (result.affected || 0) > 0;
  }

  async updateCounters(
    id: string | number,
    workflowsCount: number,
    violationsCount: number
  ): Promise<void> {
    const system = await this.findOne(id);
    if (system) {
      system.workflowsCount = workflowsCount;
      system.violationsCount = violationsCount;
      system.lastSync = new Date();
      await this.systemRepository.save(system);
    }
  }
}
