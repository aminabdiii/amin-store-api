import { EntityIdPipe } from '../common/http';
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { PageQuery } from '../common/http';
import { ProductQuery } from './catalog.dto';
import { CatalogService } from './catalog.service';
@ApiTags('Catalog')
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get('products')
  list(@Query() q: ProductQuery) {
    return this.service.list(q);
  }
  @Get('products/:id')
  detail(@Param('id', EntityIdPipe) id: number) {
    return this.service.detail(id);
  }
  @Get('products/:id/related')
  related(@Param('id', EntityIdPipe) id: number) {
    return this.service.related(id);
  }
  @Post('products/:id/views')
  view(@Param('id', EntityIdPipe) id: number) {
    return this.service.view(id);
  }
  @Get('categories')
  categories(@Query() q: PageQuery) {
    return this.service.categories(q);
  }
}
