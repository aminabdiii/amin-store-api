import { EntityIdPipe } from '../common/http';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQuery } from '../common/http';
import { CurrentUser, Principal, Public } from '../auth/auth.guard';
import { ReviewDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';
@ApiTags('Reviews')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Public()
  @Get('products/:id/reviews')
  list(@Param('id', EntityIdPipe) id: number, @Query() q: PageQuery) {
    return this.service.list(q, id);
  }
  @Post('reviews')
  create(@CurrentUser() u: Principal, @Body() dto: ReviewDto) {
    return this.service.create(u.id, dto);
  }
}
