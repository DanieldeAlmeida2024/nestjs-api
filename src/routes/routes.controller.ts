import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RoutesDriverService } from './routes-driver/routes-driver.service';
import { readRouteAccessToken } from './routes-driver/route-access-policy';
import { InternalServiceGuard, RouteReadGuard } from '../security/http-access.guards';

@Controller('routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private routesDriverService: RoutesDriverService,
  ) {}

  @UseGuards(InternalServiceGuard)
  @Post()
  create(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.create(createRouteDto);
  }

  @Post(':id/process-route')
  processRoute(
    @Param('id') id: string,
    @Body() payload: { lat: number; lng: number },
    @Headers('authorization') authorization?: string,
  ) {
    const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    const claims = readRouteAccessToken(token, process.env.ROUTES_WS_TOKEN_SECRET);
    if (!claims || claims.scope !== 'simulate' || claims.routeId !== id) {
      throw new UnauthorizedException('Credencial de simulação inválida para esta rota');
    }
    return this.routesDriverService.processRoute({
      route_id: id,
      lat: payload.lat,
      lng: payload.lng,
    });
  }

  @UseGuards(InternalServiceGuard)
  @Post(':id/start')
  startRoute(@Param('id') id: string) {
    return this.routesService.startRoute(id);
  }

  @UseGuards(InternalServiceGuard)
  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @UseGuards(RouteReadGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  @UseGuards(InternalServiceGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto) {
    return this.routesService.update(id, updateRouteDto);
  }

  @UseGuards(InternalServiceGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }
}
