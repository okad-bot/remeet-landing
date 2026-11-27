#!/usr/bin/env python3
"""ReMeet design + print bundles for Google Merchant Center.

  python3 tools/photo_books.py build              # (re)build /photo-books/<id>/ pages from PRODUCTS
  python3 tools/photo_books.py live LINKS.json     # add Stripe links, drop noindex, sitemap, feed, homepage link

LINKS.json: {"hardcover-small": "https://buy.stripe.com/...", "hardcover-big": "...", "layflat-small": "...", "layflat-big": "..."}
Prices here must equal the Stripe Payment Link amounts to the cent.
"""
import json, os, re, sys, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://remeet.cc'
PRODUCTS = [
  dict(id='hardcover-small', name='Small hardcover photo book, designed for you', price=98, pages=30, binding='hardcover',
       design=29, print=69, size='Small'),
  dict(id='hardcover-big', name='Big hardcover photo book, designed for you', price=198, pages=100, binding='hardcover',
       design=79, print=119, size='Big'),
  dict(id='layflat-small', name='Small layflat photo book, designed for you', price=158, pages=30, binding='layflat',
       design=29, print=129, size='Small'),
  dict(id='layflat-big', name='Big layflat photo book, designed for you', price=278, pages=100, binding='layflat',
       design=79, print=199, size='Big'),
]
IMAGES = ['/assets/hero-book-by-the-water.jpg', '/assets/hero-book-picnic.jpg', '/assets/hero-book-grandma.jpg',
          '/assets/shelf-bookcase.jpg', '/assets/hero-book-table.jpg']
RETURNS = "Every book is printed only after you approve the final design, so printed books can't be returned. Don't love your first draft? Full refund, as long as you haven't asked for edits."
BIND_TXT = {'hardcover': 'Hardcover print', 'layflat': 'Premium layflat print: pages open completely flat, so a photo across two pages has no fold in the middle'}

def desc(p):
    return ('A photo book of up to %d pages, designed for you from your phone photos and printed as a %s. '
            'Send an album link, get your first draft in 48 hours or less, 2 rounds of edits, printing after you approve. '
            'US and Canada shipping included.' % (p['pages'], 'premium layflat book' if p['binding'] == 'layflat' else 'hardcover book'))

def jsonld(p, url):
    offer = {
      '@type': 'Offer', 'url': url, 'price': '%.2f' % p['price'], 'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock', 'itemCondition': 'https://schema.org/NewCondition',
      'seller': {'@id': SITE + '/#organization'},
      'shippingDetails': [
        {'@type': 'OfferShippingDetails', 'shippingRate': {'@type': 'MonetaryAmount', 'value': '0', 'currency': 'USD'},
         'shippingDestination': {'@type': 'DefinedRegion', 'addressCountry': ['US', 'CA']}},
        {'@type': 'OfferShippingDetails', 'shippingRate': {'@type': 'MonetaryAmount', 'value': '15', 'currency': 'USD'},
         'shippingDestination': {'@type': 'DefinedRegion', 'addressCountry': ['GB', 'IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'AT', 'DK', 'SE', 'FI', 'PL', 'CZ']}},
      ],
      'hasMerchantReturnPolicy': {'@type': 'MerchantReturnPolicy', 'applicableCountry': ['US', 'CA'],
                                  'returnPolicyCategory': 'https://schema.org/MerchantReturnNotPermitted'},
    }
    return {'@context': 'https://schema.org', '@type': 'Product', 'sku': p['id'], 'name': p['name'], 'description': desc(p),
            'image': [SITE + i for i in IMAGES], 'brand': {'@type': 'Brand', 'name': 'ReMeet'}, 'offers': offer}

def page(p, tpl_head, tpl_header, tpl_footer, tpl_tail, link):
    url = '%s/photo-books/%s/' % (SITE, p['id'])
    title = '%s %s Photo Book, Designed for You | ReMeet' % (p['size'], 'Layflat' if p['binding'] == 'layflat' else 'Hardcover')
    d = desc(p)
    others = ''.join('<a href="/photo-books/%s/"><img src="%s" alt="" width="900" height="1200" loading="lazy" />%s<br><small>$%d</small></a>' % (
        o['id'], IMAGES[i % len(IMAGES)], html.escape(o['name'].replace(', designed for you', '')), o['price'])
        for i, o in enumerate(PRODUCTS) if o['id'] != p['id'])
    thumbs = ''.join('<button type="button" data-src="%s"%s><img src="%s" alt="" width="900" height="1200" loading="lazy" /></button>' % (
        i, ' class="on"' if k == 0 else '', i) for k, i in enumerate(IMAGES))
    head = tpl_head
    head = head.replace('__TITLE__', html.escape(title)).replace('__DESC__', html.escape(d, quote=True)).replace('__URL__', url)
    head = head.replace('__IMG__', SITE + IMAGES[0]).replace('__ROBOTS__', '' if link else '<meta name="robots" content="noindex" />\n')
    head = head.replace('__JSONLD__', json.dumps(jsonld(p, url), ensure_ascii=False))
    head = head.replace('__CRUMBS__', json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Photo books', 'item': SITE + '/#books'},
        {'@type': 'ListItem', 'position': 3, 'name': p['name'], 'item': url}]}))
    body = '''
  <main class="pdp pb" data-sku="%(id)s" data-price="%(price)d">
  <nav class="pdp-crumbs"><a href="/">Home</a> / <a href="/#books">Books</a> / %(short)s</nav>
  <div class="pdp-wrap">
    <div class="pdp-gallery">
      <img class="pb-main" id="pbMain" src="%(img0)s" alt="A ReMeet photo book" width="900" height="1200" fetchpriority="high" />
      <div class="pb-thumbs">%(thumbs)s</div>
    </div>
    <div class="pdp-info">
      <p class="pdp-style">Designed by&nbsp;hand · up&nbsp;to&nbsp;%(pages)d&nbsp;pages · %(bind)s</p>
      <h1>%(name)s</h1>
      <p class="pb-price">$%(price)d <small>USD</small></p>
      <p class="pdp-desc">Design and&nbsp;print in&nbsp;one price. US and&nbsp;Canada shipping included.</p>
      <a class="button button-dark pdp-buy pb-buy" id="pbBuy" href="%(link)s">Order, $%(price)d &rarr;</a>
      <ul class="pdp-incl">
        <li>Up&nbsp;to&nbsp;%(pages)d pages, designed page by&nbsp;page from&nbsp;your photos</li>
        <li>%(bindlong)s</li>
        <li>First draft in&nbsp;48&nbsp;hours or&nbsp;less, 2&nbsp;rounds of&nbsp;edits</li>
        <li>A&nbsp;real person, not a&nbsp;robot: I&nbsp;answer your emails and&nbsp;make your edits myself</li>
      </ul>
      <p class="pdp-contact">Questions? <a href="mailto:hello@remeet.cc">hello@remeet.cc</a></p>
    </div>
  </div>

  <section class="pb-sec">
    <h2>How it&nbsp;works</h2>
    <ol class="pb-steps">
      <li><b>Send me an&nbsp;album link.</b> iCloud or&nbsp;Google Photos, after you pay.</li>
      <li><b>First draft in&nbsp;48&nbsp;hours or&nbsp;less.</b> I&nbsp;pick the&nbsp;best photos and&nbsp;lay out every page.</li>
      <li><b>2&nbsp;rounds of&nbsp;edits.</b> Tell me what to&nbsp;change in&nbsp;plain words.</li>
      <li><b>Printing after you approve.</b> 3 to&nbsp;5 working days, then you get a&nbsp;tracking link.</li>
    </ol>
  </section>

  <section class="pb-sec">
    <h2>Shipping</h2>
    <table class="pb-ship"><tbody>
      <tr><td>United States</td><td>Included</td></tr>
      <tr><td>Canada</td><td>Included</td></tr>
      <tr><td>Europe</td><td>+$15</td></tr>
    </tbody></table>
    <p class="pdp-note">Printed in&nbsp;3 to&nbsp;5 working days after you approve the&nbsp;final design. <a href="/shipping/">Shipping details</a></p>
  </section>

  <section class="pb-sec">
    <h2>Returns</h2>
    <p class="pb-ret">%(returns)s</p>
  </section>

  <section class="pdp-more">
    <h2>Other books</h2>
    <div class="pdp-more-row pb-more">%(others)s</div>
  </section>
  </main>
''' % dict(id=p['id'], price=p['price'], short=html.escape(p['name'].replace(', designed for you', '')), img0=IMAGES[0], thumbs=thumbs,
           pages=p['pages'], bind='layflat' if p['binding'] == 'layflat' else 'hardcover', name=html.escape(p['name']),
           link=html.escape(link or '#'), bindlong=BIND_TXT[p['binding']], returns=RETURNS, others=others)
    return head + tpl_header + body + tpl_footer + tpl_tail

def templates():
    t = open(os.path.join(ROOT, 'books/travel/index.html'), encoding='utf-8').read()
    head_end = t.index('</head>')
    head = t[:head_end]
    # page-specific head bits -> placeholders
    head = re.sub(r'<title>.*?</title>', '<title>__TITLE__</title>', head, flags=re.S)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*(" />)', r'\1__URL__\2\n__ROBOTS__', head)
    head = re.sub(r'(<meta name="description" content=")[^"]*', r'\1__DESC__', head)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*', r'\1__URL__', head)
    head = re.sub(r'(<meta (?:property|name)="(?:og|twitter):title" content=")[^"]*', r'\1__TITLE__', head)
    head = re.sub(r'(<meta (?:property|name)="(?:og|twitter):description" content=")[^"]*', r'\1__DESC__', head)
    head = re.sub(r'(<meta (?:property|name)="(?:og|twitter):image" content=")[^"]*', r'\1__IMG__', head)
    blocks = re.findall(r'<script type="application/ld\+json">.*?</script>', head, flags=re.S)
    head = head.replace(blocks[0], '<script type="application/ld+json">\n__JSONLD__\n</script>').replace(blocks[1], '<script type="application/ld+json">\n__CRUMBS__\n</script>')
    head += '''<style>
.pb-main{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:50% 20%;border-radius:14px;display:block;background:#EFEDE2}
.pb-thumbs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px}
.pb-thumbs button{padding:0;border:1.5px solid transparent;border-radius:8px;overflow:hidden;background:none;cursor:pointer}
.pb-thumbs button.on{border-color:var(--olive)}
.pb-thumbs img{width:100%;height:auto;aspect-ratio:1;object-fit:cover;object-position:50% 30%;display:block}
.pb-price{font-family:var(--serif);font-size:2.2rem;margin:4px 0 6px;color:var(--ink)}.pb-price small{font-size:.9rem;color:#6f756f}
.pb-sec{max-width:720px;margin:44px auto 0}
.pb-sec h2{font-family:var(--serif);font-weight:400;text-align:center;margin:0 0 14px}
.pb-steps{padding-left:20px;line-height:1.7;color:#3d463f}
.pb-ship{width:100%;max-width:420px;margin:0 auto;border-collapse:collapse}.pb-ship td{padding:8px 4px;border-bottom:1px solid var(--line,#e4e1d8)}.pb-ship td+td{text-align:right;font-weight:600}
.pb-ret{text-align:center;color:#3d463f;line-height:1.6}
.pb-more{grid-template-columns:repeat(3,1fr)!important}.pb-more img{height:auto!important;aspect-ratio:4/3!important}
</style>
'''
    m = re.search(r'</head>\s*<body>.*?</header>\n', t, re.S)
    header = m.group(0)
    footer = t[t.index('  <footer class="footer">'):t.index('</footer>') + len('</footer>')] + '\n'
    tail = '''<script>
(function(){var m=document.getElementById('pbMain');document.querySelectorAll('.pb-thumbs button').forEach(function(b){b.addEventListener('click',function(){m.src=b.dataset.src;document.querySelectorAll('.pb-thumbs button').forEach(function(x){x.classList.toggle('on',x===b)})})});
var buy=document.getElementById('pbBuy'),main=document.querySelector('.pb');
buy.addEventListener('click',function(e){var sku=main.dataset.sku,v=+main.dataset.price;
 if(buy.getAttribute('href')==='#'){e.preventDefault();location.href='mailto:hello@remeet.cc?subject='+encodeURIComponent('Order: '+document.querySelector('h1').textContent+' ($'+v+')');return;}
 try{if(window.fbq)fbq('track','InitiateCheckout',{value:v,currency:'USD',content_ids:[sku],content_type:'product'});if(window.ym)ym(114414250,'reachGoal','checkout');if(window.clarity)clarity('event','checkout_'+sku)}catch(x){}});})();
</script>
<script src="/site.js?v=20261126a"></script>
<script src="/tw.js?v=20261124e"></script>
</body>
</html>
'''
    return head, header, footer, tail

def build(links):
    head, header, footer, tail = templates()
    for p in PRODUCTS:
        d = os.path.join(ROOT, 'photo-books', p['id']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page(p, head, header, footer, tail, links.get(p['id'])))
    print('built', len(PRODUCTS), 'pages', 'LIVE' if links else 'noindex')

def feed():
    items = []
    for p in PRODUCTS:
        url = '%s/photo-books/%s/' % (SITE, p['id'])
        e = html.escape
        items.append('''  <item>
    <g:id>%s</g:id>
    <g:title>%s</g:title>
    <g:description>%s</g:description>
    <g:link>%s</g:link>
    <g:image_link>%s</g:image_link>
%s    <g:price>%.2f USD</g:price>
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:brand>ReMeet</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>Media &gt; Books</g:google_product_category>
    <g:shipping><g:country>US</g:country><g:price>0.00 USD</g:price></g:shipping>
    <g:shipping><g:country>CA</g:country><g:price>0.00 USD</g:price></g:shipping>
  </item>''' % (p['id'], e(p['name']), e(desc(p)), url, SITE + IMAGES[0],
               ''.join('    <g:additional_image_link>%s</g:additional_image_link>\n' % (SITE + i) for i in IMAGES[1:]), p['price']))
    xml = '''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ReMeet photo books</title>
  <link>%s</link>
  <description>Designed and printed photo books by ReMeet</description>
%s
</channel>
</rss>
''' % (SITE, '\n'.join(items))
    open(os.path.join(ROOT, 'google-merchant-feed.xml'), 'w', encoding='utf-8').write(xml)
    print('feed written')

def live(path):
    links = json.load(open(path))
    miss = [p['id'] for p in PRODUCTS if not str(links.get(p['id'], '')).startswith('https://buy.stripe.com/')]
    if miss: sys.exit('missing Stripe links: %s' % miss)
    build(links); feed()
    sm = os.path.join(ROOT, 'sitemap-pages.xml'); t = open(sm, encoding='utf-8').read()
    for p in PRODUCTS:
        loc = '%s/photo-books/%s/' % (SITE, p['id'])
        if loc not in t:
            t = t.replace('</urlset>', '  <url><loc>%s</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>' % loc)
    open(sm, 'w', encoding='utf-8').write(t)
    ix = os.path.join(ROOT, 'index.html'); t = open(ix, encoding='utf-8').read()
    marker = 'Printing from&nbsp;$69, after you approve your book.</p>'
    if 'href="/photo-books/' not in t and marker in t:
        t = t.replace(marker, 'Printing from&nbsp;$69, after you approve your book. Or&nbsp;get <a href="/photo-books/hardcover-small/">design and&nbsp;print in&nbsp;one price</a>: hardcover from&nbsp;$98, layflat from&nbsp;$158.</p>', 1)
        open(ix, 'w', encoding='utf-8').write(t)
    print('live: sitemap + homepage link added')

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'live': live(sys.argv[2])
    else: build({})
