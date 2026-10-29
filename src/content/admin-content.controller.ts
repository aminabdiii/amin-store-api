import { EntityIdPipe } from '../common/http';
import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Admin } from '../auth/auth.guard';
import {
  ArticleDto,
  BrandDto,
  FaqDto,
  FeatureDto,
  UpdateArticleDto,
  UpdateBrandDto,
  UpdateFaqDto,
  UpdateFeatureDto,
} from './content.dto';
import { ContentService } from './content.service';
@ApiTags('Administration · Content')
@ApiBearerAuth()
@Admin()
@Controller('admin')
export class AdminContentController {
  constructor(private readonly service: ContentService) {}
  @Post('articles')
  createArticle(@Body() dto: ArticleDto) {
    return this.service.createArticle(dto);
  }
  @Patch('articles/:id')
  updateArticle(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.service.updateArticle(id, dto);
  }
  @Delete('articles/:id')
  deleteArticle(@Param('id', EntityIdPipe) id: number) {
    return this.service.remove('articles', id);
  }
  @Post('faqs')
  createFaq(@Body() dto: FaqDto) {
    return this.service.createFaq(dto);
  }
  @Patch('faqs/:id')
  updateFaq(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateFaqDto) {
    return this.service.updateFaq(id, dto);
  }
  @Delete('faqs/:id')
  deleteFaq(@Param('id', EntityIdPipe) id: number) {
    return this.service.remove('faqs', id);
  }
  @Post('brands')
  createBrand(@Body() dto: BrandDto) {
    return this.service.createBrand(dto);
  }
  @Patch('brands/:id')
  updateBrand(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.service.updateBrand(id, dto);
  }
  @Delete('brands/:id')
  deleteBrand(@Param('id', EntityIdPipe) id: number) {
    return this.service.remove('brands', id);
  }
  @Post('features')
  createFeature(@Body() dto: FeatureDto) {
    return this.service.createFeature(dto);
  }
  @Patch('features/:id')
  updateFeature(@Param('id', EntityIdPipe) id: number, @Body() dto: UpdateFeatureDto) {
    return this.service.updateFeature(id, dto);
  }
  @Delete('features/:id')
  deleteFeature(@Param('id', EntityIdPipe) id: number) {
    return this.service.remove('features', id);
  }
}
