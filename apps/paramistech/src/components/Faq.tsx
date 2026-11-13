import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@project/components/ui/accordion';
import { useContent } from '../content';
import { SectionHead, sectionCls } from './ui-bits';

export default function Faq() {
  const { faqs } = useContent();
  return (
    <section id="faq" className={sectionCls}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
      <div className="lg:sticky lg:top-28 lg:h-fit"><SectionHead center={false} kicker="سوالات متداول" en="FAQ" title={<>پاسخ سوال‌هایی که <span className="text-gradient">احتمالاً دارید</span></>} desc="سوال دیگری دارید؟ در فرم پایین صفحه بپرسید." /></div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`f${i}`} className="rounded-3xl border border-border bg-card px-5 shadow-soft md:px-6 transition-colors data-[state=open]:border-foreground/30">
            <AccordionTrigger className="gap-4 py-5 text-right text-[15px] font-bold leading-7 hover:no-underline md:text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-7 text-muted-foreground md:text-[15px] md:leading-8">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      </div>
    </section>
  );
}
