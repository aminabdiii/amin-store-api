import { EntityIdPipe } from '../common/http';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Admin, CurrentUser, Principal } from '../auth/auth.guard';
import { PageQuery } from '../common/http';
import {
  CategoryDto,
  CreateProductDto,
  InventoryDto,
  ProductQuery,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto';
import { CatalogService } from './catalog.service';
@ApiTags('Administration · Catalog')
@ApiBearerAuth()
@Admin()
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get('products')
  list(@Query() q: ProductQuery) {
    return this.service.list(q, true);
  }
  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }
  @Patch('products/:id')
  update(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }
  @Delete('products/:id')
  archive(@Param('id', EntityIdPipe) id: number) {
    return this.service.archive(id);
  }
  @Post('categories')
  category(@Body() dto: CategoryDto) {
    return this.service.createCategory(dto);
  }
  @Patch('categories/:id')
  updateCategory(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }
  @Delete('categories/:id')
  deleteCategory(@Param('id', EntityIdPipe) id: number) {
    return this.service.deleteCategory(id);
  }
  @Post('variants/:id/inventory')
  inventory(
    @Param('id', EntityIdPipe) id: number,
    @Body() dto: InventoryDto,
    @CurrentUser() u: Principal,
  ) {
    return this.service.inventory(id, dto, u.id);
  }
  @Get('variants/:id/inventory')
  movements(@Param('id', EntityIdPipe) id: number, @Query() q: PageQuery) {
    return this.service.movements(id, q);
  }
}
