import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: [
            'http://localhost:3000',
            'https://pharmaflow-pro-one.vercel.app',
            'https://pharmaflow-pro-git-main-adhivedhanlrs-projects.vercel.app',
            'https://pharmaflow-pro.vercel.app'
        ],
        credentials: true,
    },
})
export class SalesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('SalesGateway');

    @SubscribeMessage('msgToServer')
    handleMessage(client: Socket, payload: string): void {
        this.server.emit('msgToClient', payload);
    }

    afterInit(server: Server) {
        this.logger.log('Init');
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    notifyNewOrder(orderData: any) {
        this.server.emit('new-order', orderData);
    }

    notifyAttendanceUpdate(data: any) {
        this.server.emit('attendance-update', data);
    }
}
