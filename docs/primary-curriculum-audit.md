# Primary Curriculum Routing Audit

Date: 2026-08-11

## Scope

This record audits textbook routing metadata used by the primary question bank.
It does not claim that the app's core topic list is a full publisher-specific
table of contents. Questions remain original exercises; the cited material is
used only to validate curriculum routing and term placement.

## Verified corrections

| Selection | Verified fact | Product rule |
| --- | --- | --- |
| RJB, grade 4 | `Observation of objects (II)` belongs to the lower volume, unit 2. The PEP upper-volume contents do not include it. | Route `view_from_direction` to the lower volume only, with the source chapter label `Unit 2 Observation of objects (II)`. |
| Qingdao edition | The publisher publishes both 6-3 and 5-4 textbook systems. | The existing `qd` option is explicitly labeled and routed as `6-3`; it must not be presented as a generic Qingdao edition. |
| Shanghai edition | Shanghai local mathematics materials follow the 5-4 system. | Label and carry `schoolSystem: 5-4` through learning maps, practice questions, and diagnostic questions. |

## Evidence

1. People's Education Press, 2022 elementary mathematics digital textbooks:
   https://bp.pep.com.cn/xsjc2022/index.html
2. People's Education Press, grade-4 upper-volume contents, pages 6-7:
   https://download.pep.com.cn/xsxjc/22xjcsx41x/files/mobile/6.jpg
   https://download.pep.com.cn/xsxjc/22xjcsx41x/files/mobile/7.jpg
3. University of Science and Technology of China library catalogue, PEP grade-4
   lower volume. This is catalogue corroboration for the lower-volume unit, not
   a source for copying question text:
   https://p-cloud.lib.ustc.edu.cn/showpage.do?METAID=102781&status=show
4. Qingdao Publishing Group notice describing both 6-3 and 5-4 textbook
   systems:
   https://www.qdpub.com/index/index/newsdetail?ids=119
5. Shanghai Municipal Education Commission local textbook list:
   https://edu.sh.gov.cn/cmsres/2d/2dc160ca4658483e8eaaf76e8f945637/28a7fabd94b936378d6dd4c271c12ad8.pdf

## Automated coverage

- `tests/primary-rjb-g4-curriculum-routing.test.js` verifies the RJB grade-4
  term correction and confirms that question selection follows it.
- `tests/primary-curriculum-system-routing.test.js` verifies that Qingdao and
  Shanghai school-system metadata is consistent in the picker option,
  curriculum scopes, learning map, practice bank, and diagnostic bank.

## Deliberate limits

- No per-topic term changes were made for BSD, SUJ, XSB, Hebei, or Xiang. The
  available official pages did not provide enough citable, edition-specific
  catalog detail to safely change their existing core topic routing.
- `qd` means Qingdao 6-3 only. A Qingdao 5-4 route requires its own primary
  and junior sequence; it must not reuse the 6-3 mapping.
- The current primary picker still exposes grades 1-6 for every primary
  edition. For a complete Shanghai 5-4 experience, a coordinated stage-picker
  and junior-grade 6-9 mapping is still required. This audit does not silently
  remap grade 6, because doing so would show students a false curriculum.
