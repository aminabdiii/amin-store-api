import { EntityIdPipe } from '../common/http';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { PageQuery } from '../common/http';
import { ContentService } from './content.service';
@ApiTags('Content')
@Public()
@Controller()
export class ContentController {
  constructor(private readonly service: ContentService) {}
  @Get('articles')
  articles(@Query() q: PageQuery) {
    return this.service.list('articles', q);
  }
  @Get('articles/:id')
  article(@Param('id', EntityIdPipe) id: number) {
    return this.service.article(id);
  }
  @Get('faqs')
  faqs(@Query() q: PageQuery) {
    return this.service.list('faqs', q);
  }
  @Get('brands')
  brands(@Query() q: PageQuery) {
    return this.service.list('brands', q);
  }
  @Get('features')
  features(@Query() q: PageQuery) {
    return this.service.list('features', q);
  }
}
