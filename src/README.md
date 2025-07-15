приходит новый объект
добавляем туда все поля без ссылок, которых нет
(кроме полей сущностей, у них запоминаем координаты childOrm-id-parentOrm-id-path)
поля сущностей подставляем, когда заполнено остальное

учитывается 3 уровня вложенности связей
parent-child-2child
ребёнок может встречаться несколько раз
или быть в массиве

изменения бывают:
сущности (поля)
связи (поля с сущностью)

что мы здесь тестируем
child-parentProp->parentProp
child-parentNewProp->parentNewProp
child->parentChild
child-2child->parentChildArr

item - всё, где есть id
может быть в массиве и сам по себе
у всех item могут быть абстрактные поля любого рода
item может лежать вложенно
но если он в массиве и не внутри другого item, то только на 1 уровне
[{ noId: 'e', item: someItemWithId }] нельзя, массив внутри массива тоже (пока что)
у item могут изменяться поля, вложенные item, добавляться новые поля, сортироваться массивы item'ов, фильтроваться массивы item'ов, заменяться item с одним id на другой - все эти (и другие? случаи нужно протестировать)
вот такой намёток. поможешь привести к идеалу?

parent-child-second
new parent
new child
new child
new second
new second
rm second from child (null+new)
rm child from parent (null+new)

parent+(2 child-second)

[parent-child, parent2-child, parent-child, parent3-child2]
upd parent
upd child
add new parent
replace 2->parent4
rm 0
rm 1+2
sort [parent-child, parent-child, parent3-child2, parent2-child]
