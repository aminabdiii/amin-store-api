import { Injectable } from '@nestjs/common';
import sanitize from 'sanitize-html';
import { Database } from '../common/database.service';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { mediaUrl } from '../common/presenters';
import { configuration } from '../common/config';
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
type Kind = 'articles' | 'faqs' | 'brands' | 'features';
@Injectable()
export class ContentService {
  constructor(private readonly db: Database) {}
  private html(value: string) {
    return sanitize(value, {
      allowedTags: [...sanitize.defaults.allowedTags, 'img'],
      allowedAttributes: {
        ...sanitize.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height'],
      },
      transformTags: {
        img: (_tag, attrs) => ({
          tagName: 'img',
          attribs: attrs.src?.startsWith(configuration().mediaPublicUrl + '/')
            ? attrs
            : { alt: attrs.alt ?? '' },
        }),
      },
    });
  }
  async list(kind: Kind, q: PageQuery) {
    const args = { skip: skip(q), take: q.limit, orderBy: { id: 'desc' as const } };
    switch (kind) {
      case 'articles': {
        const [data, total] = await this.db.$transaction([
          this.db.article.findMany({ ...args, include: { image: true } }),
          this.db.article.count(),
        ]);
        return pageResult(
          data.map((x) => ({
            ...x,
            image: x.image ? { id: x.image.id, url: mediaUrl(x.image.filename) } : null,
          })),
          total,
          q,
        );
      }
      case 'faqs': {
        const [data, total] = await this.db.$transaction([
          this.db.faq.findMany(args),
          this.db.faq.count(),
        ]);
        return pageResult(data, total, q);
      }
      case 'brands': {
        const [data, total] = await this.db.$transaction([
          this.db.brand.findMany({ ...args, include: { image: true } }),
          this.db.brand.count(),
        ]);
        return pageResult(
          data.map((x) => ({
            ...x,
            image: x.image ? { id: x.image.id, url: mediaUrl(x.image.filename) } : null,
          })),
          total,
          q,
        );
      }
      case 'features': {
        const [data, total] = await this.db.$transaction([
          this.db.feature.findMany({ ...args, include: { image: true } }),
          this.db.feature.count(),
        ]);
        return pageResult(
          data.map((x) => ({
            ...x,
            image: x.image ? { id: x.image.id, url: mediaUrl(x.image.filename) } : null,
          })),
          total,
          q,
        );
      }
    }
  }
  async article(id: number) {
    const article = await this.db.article.findUnique({ where: { id }, include: { image: true } });
    if (!article) fail(404, 'NOT_FOUND', 'Article not found');
    return {
      ...article,
      image: article.image ? { id: article.image.id, url: mediaUrl(article.image.filename) } : null,
    };
  }
  createArticle(dto: ArticleDto) {
    return this.db.article.create({ data: { ...dto, content: this.html(dto.content) } });
  }
  updateArticle(id: number, dto: UpdateArticleDto) {
    return this.db.article.update({
      where: { id },
      data: { ...dto, ...(dto.content !== undefined ? { content: this.html(dto.content) } : {}) },
    });
  }
  createFaq(dto: FaqDto) {
    return this.db.faq.create({ data: dto });
  }
  updateFaq(id: number, dto: UpdateFaqDto) {
    return this.db.faq.update({ where: { id }, data: dto });
  }
  createBrand(dto: BrandDto) {
    return this.db.brand.create({ data: dto });
  }
  updateBrand(id: number, dto: UpdateBrandDto) {
    return this.db.brand.update({ where: { id }, data: dto });
  }
  createFeature(dto: FeatureDto) {
    return this.db.feature.create({ data: dto });
  }
  updateFeature(id: number, dto: UpdateFeatureDto) {
    return this.db.feature.update({ where: { id }, data: dto });
  }
  async remove(kind: Kind, id: number) {
    switch (kind) {
      case 'articles':
        await this.db.article.delete({ where: { id } });
        break;
      case 'faqs':
        await this.db.faq.delete({ where: { id } });
        break;
      case 'brands':
        await this.db.brand.delete({ where: { id } });
        break;
      case 'features':
        await this.db.feature.delete({ where: { id } });
    }
    return { success: true };
  }
}
