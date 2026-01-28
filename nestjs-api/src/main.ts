import 'reflect-metadata';
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { json } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: false,
    forbidNonWhitelisted: false,
    transform: true
  }));

  // Configure CORS properly
  app.enableCors({
    origin: true, // Allow all origins (you can restrict this in production)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-token",
      "api-token",
    ],
  });

  // Enable verbose Nest logger levels
  app.useLogger(["log", "error", "warn", "debug", "verbose"]);

  // giữ raw body để tính HMAC đúng
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf?.toString();
      },
    })
  );

  // Lightweight request logging (method, url, status, latency)
  app.use((req: any, res: any, next: any) => {
    const start = process.hrtime();
    const { method, originalUrl } = req;
    res.on("finish", () => {
      const diff = process.hrtime(start);
      const ms = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
      const status = res.statusCode;
      // eslint-disable-next-line no-console
      console.log(`[HTTP] ${method} ${originalUrl} ${status} - ${ms}ms`);
    });
    next();
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("SLA Service API")
    .setDescription("API documentation for SLA Centralized Microservice")
    .setVersion("1.0")
    .addTag("workflows", "Workflow management endpoints")
    .addTag("systems", "System management endpoints")
    .addTag("sla", "SLA tracking endpoints")
    .addTag("notifications", "Notification endpoints")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SLA API listening on port ${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`
  );
}

bootstrap();
