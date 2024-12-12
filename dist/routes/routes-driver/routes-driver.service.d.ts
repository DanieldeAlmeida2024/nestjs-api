import { PrismaService } from 'src/prisma/prisma.service';
export declare class RoutesDriverService {
    private prismaService;
    constructor(prismaService: PrismaService);
    processRoute(dto: {
        route_id: string;
        lat: number;
        lng: number;
    }): Promise<void>;
}
