import { EntityIdPipe } from '../common/http';
import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQuery } from '../common/http';
import { Admin } from '../auth/auth.guard';
import { ModerateDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';
@ApiTags('Administration · Reviews')
@ApiBearerAuth()
@Admin()
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get()
  list(@Query() q: PageQuery) {
    return this.service.list(q);
  }
  @Patch(':id')
  moderate(@Param('id', EntityIdPipe) id: number, @Body() dto: ModerateDto) {
    return this.service.moderate(id, dto.approved);
  }
  @Delete(':id')
  remove(@Param('id', EntityIdPipe) id: number) {
    return this.service.moderate(id);
  }
}
